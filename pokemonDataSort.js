const fs = require('fs');
const path = require('path');

// Function to sort the generations
function sortGenerations(data) {
    const sortedData = {};
    for (const generation in data) {
        const sortedGeneration = {};
        const keys = Object.keys(data[generation]).sort();
        keys.forEach(key => {
            sortedGeneration[key] = data[generation][key];
        });
        sortedData[generation] = sortedGeneration;
    }
    return sortedData;
}

// Define the file path
const filePath = path.join(__dirname, 'pokemonData.json');

// Read data from the input file
fs.readFile(filePath, 'utf8', (err, jsonData) => {
    if (err) {
        console.error('Error reading the file:', err.message);
        return;
    }

    let data;
    try {
        // Parse the JSON data
        data = JSON.parse(jsonData);
    } catch (parseErr) {
        console.error('Error parsing JSON data:', parseErr.message);
        return;
    }

    // Sort the data
    const sortedData = sortGenerations(data);

    // Save the sorted data to the output file
    fs.writeFile(filePath, JSON.stringify(sortedData, null, 4), (err) => {
        if (err) {
            console.error('Error writing the file:', err.message);
            return;
        }
        console.log('Data has been sorted and saved to pokemonData.json');
    });
});