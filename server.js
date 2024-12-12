const express = require('express');
const router = require('./routes/index');

const port = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    }
);

app.use('/', router);


module.exports = app;