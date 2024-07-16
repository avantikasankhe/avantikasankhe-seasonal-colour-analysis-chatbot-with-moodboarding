const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 9000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());

// Endpoint to run the Python script
app.post('/run-script', (req, res) => {
    const args = req.body.args;

    // Ensure that the required arguments are provided
    if (!args || args.length < 3) {
        return res.status(400).send('Error: color, gender, and product arguments are required.');
    }

    const pythonProcess = spawn('python', ['./myntra.py', ...args]); // Pass arguments from the client

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python Output: ${data}`);
        // Optionally, you can accumulate data and send it once the script finishes
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
        // Send the error response if it occurs
        if (!res.headersSent) {
            res.status(500).send(data.toString());
        }
    });

    pythonProcess.on('exit', (code) => {
        console.log(`Python script finished with exit code ${code}`);
        if (code === 0) {
            res.send(`Script finished successfully with code ${code}`);
        } else {
            res.status(500).send(`Script finished with error code ${code}`);
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
