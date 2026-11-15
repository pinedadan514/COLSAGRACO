// Servidor de la plataforma COLSAGRACO: inicia la aplicación en un puerto
const app = require('./app');
const db = require('./db');

// Comprobar la conexión con la base de datos al iniciar
db.query('SELECT 1')
    .then(() => console.log('Conexión con MySQL exitosa'))
    .catch((error) => console.log('Error al conectar con MySQL:', error.message));

// Puerto: el hosting lo indica con la variable PORT; en el PC se usa 3000
const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
    console.log(`Servidor COLSAGRACO funcionando en http://localhost:${PUERTO}`);
});
