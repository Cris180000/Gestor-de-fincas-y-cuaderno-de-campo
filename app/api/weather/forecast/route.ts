import { NextRequest, NextResponse } from "next/server";

/**
 * Reglas agronómicas básicas para pulverización.
 * Nota: el viento que devuelve OpenWeatherMap está en m/s → se convierte a km/h.
 */
const MAX_WIND_KMH_BUENO = 15; // no pulverizar con viento mayor
const MAX_TEMP_C_BUENO = 25; // por encima aumenta evaporación/deriva
const MAX_RAIN_PROB_BUENO = 0.3; // < 30 % de probabilidad de lluvia

type Suitability = "bueno" | "regular" | "malo";

/**
 * GET /api/weather/forecast?lat=xx&lon=yy
 *
 * Proxy sencillo hacia OpenWeatherMap (5 day / 3 hour forecast),
 * resumido por día para que el cliente pueda decidir la ventana
 * de tratamiento.
 *
 * Requiere OPENWEATHER_API_KEY en .env
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      {
        error:
          "Clima no configurado: falta OPENWEATHER_API_KEY. Crea una API key gratuita en https://openweathermap.org/ y añádela a tu .env",
      },
      { status: 503 }
    );
  }

  const url = request.nextUrl;
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Faltan parámetros lat y lon en la consulta." },
      { status: 400 }
    );
  }

  const units = url.searchParams.get("units") ?? "metric";
  const lang = url.searchParams.get("lang") ?? "es";

  const owmUrl = new URL("https://api.openweathermap.org/data/2.5/forecast");
  owmUrl.searchParams.set("lat", lat);
  owmUrl.searchParams.set("lon", lon);
  owmUrl.searchParams.set("units", units);
  owmUrl.searchParams.set("lang", lang);
  owmUrl.searchParams.set("appid", apiKey.trim());

  try {
    const res = await fetch(owmUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    const raw = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Error al llamar a OpenWeatherMap: ${raw.message || res.status}`,
        },
        { status: res.status }
      );
    }

    // raw.list es una lista de bloques de 3 horas
    type Item = {
      dt: number;
      main?: { temp?: number; temp_max?: number };
      wind?: { speed?: number };
      rain?: { [key: string]: number };
      pop?: number; // probability of precipitation (0–1)
      weather?: { main?: string }[];
    };

    const byDate = new Map<
      string,
      {
        date: string;
        rainMm: number;
        windMaxKmh: number;
        tempMaxC: number;
        rainProbMax: number;
        hasStorm: boolean;
      }
    >();

    const list: Item[] = raw.list ?? [];
    for (const it of list) {
      const date = new Date(it.dt * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
      const existing = byDate.get(date) ?? {
        date,
        rainMm: 0,
        windMaxKmh: 0,
        tempMaxC: Number.NEGATIVE_INFINITY,
        rainProbMax: 0,
        hasStorm: false,
      };

      // Lluvia: sumamos cualquier campo de lluvia disponible
      let rain = 0;
      if (it.rain && typeof it.rain === "object") {
        for (const v of Object.values(it.rain)) {
          if (typeof v === "number" && !Number.isNaN(v)) {
            rain += v;
          }
        }
      }
      existing.rainMm += rain;

      const windSpeed = it.wind?.speed ?? 0; // m/s
      const windKmh = windSpeed * 3.6;
      if (windKmh > existing.windMaxKmh) {
        existing.windMaxKmh = windKmh;
      }

      const tempMax = it.main?.temp_max ?? it.main?.temp;
      if (typeof tempMax === "number" && tempMax > existing.tempMaxC) {
        existing.tempMaxC = tempMax;
      }

      const pop = typeof it.pop === "number" ? it.pop : 0;
      if (pop > existing.rainProbMax) {
        existing.rainProbMax = pop;
      }

      const hasStorm =
        (it.weather || []).some((w) =>
          ["Thunderstorm", "Squall", "Tornado"].includes(w.main ?? "")
        ) || existing.hasStorm;

      existing.hasStorm = hasStorm;
      byDate.set(date, existing);
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const days = Array.from(byDate.values())
      .filter((d) => d.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 7)
      .map((d) => {
        // Normalizamos valores faltantes
        const tempMaxC = Number.isFinite(d.tempMaxC) ? d.tempMaxC : 0;
        const windMaxKmh = d.windMaxKmh;
        const rainProb = d.rainProbMax; // 0–1

        // Clasificación agronómica:
        // - "malo": se incumple claramente alguna regla estricta
        // - "regular": se acerca a los límites
        // - "bueno": dentro de los márgenes recomendados
        let score: Suitability = "bueno";

        if (
          windMaxKmh > MAX_WIND_KMH_BUENO + 3 || // viento claramente excesivo
          tempMaxC > MAX_TEMP_C_BUENO + 3 || // demasiado calor
          rainProb >= MAX_RAIN_PROB_BUENO + 0.2 || // probabilidad de lluvia muy alta
          d.rainMm > 5 || // lluvia acumulada importante
          d.hasStorm
        ) {
          score = "malo";
        } else if (
          windMaxKmh > MAX_WIND_KMH_BUENO ||
          tempMaxC > MAX_TEMP_C_BUENO ||
          rainProb >= MAX_RAIN_PROB_BUENO ||
          d.rainMm > 1
        ) {
          score = "regular";
        }

        return {
          date: d.date,
          rainMm: Number(d.rainMm.toFixed(1)),
          windMaxKmh: Number(windMaxKmh.toFixed(1)),
          tempMaxC: Number(tempMaxC.toFixed(1)),
          rainProbPercent: Math.round(rainProb * 100),
          hasStorm: d.hasStorm,
          suitability: score,
        };
      });

    // Semáforo por horas (próximas 24 h aprox., usando bloques de 3 h)
    const slots24h = list
      .filter((it) => {
        const t = new Date(it.dt * 1000);
        const diffHours = (t.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 24;
      })
      .map((it) => {
        const t = new Date(it.dt * 1000);
        const iso = t.toISOString();
        const windSpeed = it.wind?.speed ?? 0;
        const windKmh = windSpeed * 3.6;
        const tempMaxC = it.main?.temp_max ?? it.main?.temp ?? 0;
        const rainProb = typeof it.pop === "number" ? it.pop : 0;

        let suitability: Suitability = "bueno";
        if (
          windKmh > MAX_WIND_KMH_BUENO + 3 ||
          tempMaxC > MAX_TEMP_C_BUENO + 3 ||
          rainProb >= MAX_RAIN_PROB_BUENO + 0.2 ||
          it.rain && Object.values(it.rain).some((v) => (typeof v === "number" ? v : 0) > 3) ||
          (it.weather || []).some((w) =>
            ["Thunderstorm", "Squall", "Tornado"].includes(w.main ?? "")
          )
        ) {
          suitability = "malo";
        } else if (
          windKmh > MAX_WIND_KMH_BUENO ||
          tempMaxC > MAX_TEMP_C_BUENO ||
          rainProb >= MAX_RAIN_PROB_BUENO
        ) {
          suitability = "regular";
        }

        return {
          time: iso,
          windKmh: Number(windKmh.toFixed(1)),
          tempC: Number(tempMaxC.toFixed(1)),
          rainProbPercent: Math.round(rainProb * 100),
          suitability,
        };
      });

    return NextResponse.json({
      lat: Number(lat),
      lon: Number(lon),
      days,
      slots24h,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido al consultar el clima";
    return NextResponse.json(
      { error: `No se pudo obtener la previsión meteorológica: ${msg}` },
      { status: 502 }
    );
  }
}

