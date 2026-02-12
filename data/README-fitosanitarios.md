# Registro de productos fitosanitarios

El archivo `fitosanitarios-registro.json` se usa para validar tratamientos frente al registro oficial.

- **Origen**: Ministerio de Agricultura, Pesca y Alimentación (MAPA). Registro en [servicio.mapa.gob.es/regfiweb](https://servicio.mapa.gob.es/regfiweb).
- **Contenido actual**: Datos de ejemplo para probar la validación (producto no registrado, prohibido para cultivo, dosis máxima).
- **Producción**: Sustituir por el fichero JSON oficial del MAPA cuando esté disponible para descarga automatizada, manteniendo la estructura de `nombre`, `registro`, `usos` (array de `{ cultivos: string[], dosisMax: string }`).

La app comprueba al crear o editar una labor de tipo "tratamiento":
1. Que el producto figure en el registro.
2. Que esté autorizado para el cultivo de la parcela.
3. Que la dosis no supere el máximo legal.

Si no se cumple, se muestra una alerta bloqueante y no se guarda.
