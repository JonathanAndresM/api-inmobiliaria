import express, { json } from 'express';
import fs from "fs";
import bodyParser from "body-parser";
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configuración de multer para manejar la carga de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'imagenes/'); // Directorio donde se guardarán las imágenes
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Usar el nombre original del archivo
    }
});
const upload = multer({ storage: storage });

// Carpeta donde se guardarán las imágenes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'imagenes')))

// Configuración de CORS
app.use(cors({
    origin: '*',  // Permitir solo peticiones desde este origen
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Ruta para subir imagen con multer
app.post("/subir-imagen", upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No se ha subido ningun archivo.")
    }
    res.send('File uploaded!');
});


// Funciones auxiliares para leer y escribir datos
const readData = () => {
    try {
        const data = fs.readFileSync("./db.json");
        return JSON.parse(data);
    } catch (error) {
        console.error(error);
        return { propiedades: [] }; // Devolver una lista vacía si hay un error
    }
};

const writeData = (data) => {
    try {
        fs.writeFileSync("./db.json", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing file:', error);
    }
}

// Configuración para servir archivos estáticos desde la carpeta 'imagenes'
const dataFilePath = `${__dirname}/db.json`;
const data = fs.readFileSync(dataFilePath, 'utf8');
app.use('/imagenes', express.static(join(__dirname, 'imagenes')));

// Rutas de la API
app.get("/", (req, res) => {
    res.send("Welcome to my test API with Node js!")
});

app.get("/propiedades", (req, res) => {
    const data = readData();
    res.json(data.propiedades);
});

app.get("/propiedades/:id", (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id);
    const propiedad = data.propiedades.find((propiedad) => propiedad.id === id);
    res.json(propiedad);
});

app.post("/propiedades", upload.single('file'), (req, res) => {
    try {
        // const data = readData();
        const body = req.body;

        // Verificar que `req.file` no sea undefined
        if (!req.file) {
            return res.status(400).send("No se ha subido ningun archivo.");
        }

        // Crear una nueva propiedad con los datos recibidos
        const newPropiedad = {
            category: body.category,
            description: body.description,
            price: body.price,
            type: body.type,
            imgPortada: req.file.filename,
            hambiente: body.hambiente,
            zone: body.zone
        };
        // Leer y escribir en un archivo JSON
        let data = readData();
        // Agregar la nueva propiedad a la lista de propiedades
        newPropiedad.id = data.propiedades.length + 1; // Generar un nuevo ID
        data.propiedades.push(newPropiedad); // Agregar la nueva propiedad
        //fs.writeFileSync('db.json', JSON.stringify(data, null, 2)); // Guardar en el archivo
        // Guardar los datos actualizados en el archivo db.json
        writeData(data);
        // Devolver la nueva propiedad agregada como respuesta
        //res.json(newPropiedad);
        res.status(200).json(newPropiedad); // Devolver la nueva propiedad creada
    } catch (error) {
        console.error('Error al crear una nueva propiedad:', error);
        res.status(500).json({ error: error.message });
    }
    console.log(req.body);
});

// Ruta para subir imagen
/*app.post("/subir-imagen", (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    // La imagen se recibe como req.files.file (de acuerdo a tu formulario)
    const file = req.files.file;
    const fileName = file.name; // Puedes usar un nombre único aquí, por ejemplo, el ID de la propiedad

    // Guardar la imagen en una carpeta en el servidor
    file.mv(`./imagenes/${fileName}`, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('File uploaded!');
    });
});*/

app.put("/propiedades/:id", upload.single('file'), (req, res) => {
    const id = parseInt(req.params.id);
    const data = readData();
    const body = req.body;

    // Encontrar la propiedad que se desea actualizar
    const propiedadIndex = data.propiedades.findIndex(propiedad => propiedad.id === id);
    if (propiedadIndex === -1) {
        return res.status(404).json({ message: "Propiedad no encontrada" });
    }

    // Guardar el nombre del archivo de la imagen anterior antes de actualizar
    const imagenAnterior = data.propiedades[propiedadIndex].imgPortada;

    // Actualizar los campos de la propiedad con los datos recibidos
    data.propiedades[propiedadIndex] = {
        ...data.propiedades[propiedadIndex],
        category: body.category || data.propiedades[propiedadIndex].category,
        description: body.description || data.propiedades[propiedadIndex].description,
        price: body.price || data.propiedades[propiedadIndex].price,
        type: body.type || data.propiedades[propiedadIndex].type,
        hambiente: body.hambiente || data.propiedades[propiedadIndex].hambiente,
        zone: body.zone || data.propiedades[propiedadIndex].zone,
        // Si se cargó una nueva imagen, actualizar el nombre del archivo
        imgPortada: req.file ? req.file.filename : data.propiedades[propiedadIndex].imgPortada
    };

    // Eliminar la imagen anterior si se cargó una nueva imagen
    if (req.file && imagenAnterior) {
        const imagenPath = join(__dirname, 'imagenes', imagenAnterior);
        fs.unlink(imagenPath, (err) => {
            if (err) {
                console.error('Error al eliminar la imagen anterior:', err);
            }
        });
    }

    // Guardar los datos actualizados en el archivo db.json
    writeData(data);
    res.json({  message: "Propiedad actualizada exitosamente", propiedad: data.propiedades[propiedadIndex] });
});

app.delete("/propiedades/:id", (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id);
    const propiedadIndex = data.propiedades.findIndex((propiedad) => propiedad.id === id);

    if (propiedadIndex === -1) {
        return res.status(404).json({ message: "Propiedad no encontrada" });
    }

    const imagenPath = `./imagenes/${data.propiedades[propiedadIndex].imgPortada}`;

    // Eliminar la imagen del servidor
    fs.unlink(imagenPath, (err) => {
        if (err) {
            console.error('Error al eliminar la imagen:', err);
        }
    });

    // Eliminar la propiedad de la lista
    data.propiedades.splice(propiedadIndex, 1);
    writeData(data);
    res.json({ message: "Propiedad deleted successfully" });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});