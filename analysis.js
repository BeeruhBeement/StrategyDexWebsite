document.addEventListener('DOMContentLoaded', function() {
    // Get the Pokemon name and generation from the URL query parameters
    const params = new URLSearchParams(window.location.search);
    const pokemonName = params.get('pokemon');
    const generation = params.get('generation');

    // Get elements
    const pokemonNameElement = document.getElementById('pokemon-name');
    const sprite = document.getElementById('pokemon-sprite');
    const stats = document.getElementById('pokemon-stats');
    const typing = document.getElementById('pokemon-typing');
    const abilities = document.getElementById('pokemon-abilities');
    const suAnalysis = document.getElementById('su-analysis');
    const iuAnalysis = document.getElementById('iu-analysis');
    const suAnalysisContainer = document.getElementById('su-analysis-container');
    const iuAnalysisContainer = document.getElementById('iu-analysis-container');
    const backButton = document.getElementById('back-button');
    const suButton = document.getElementById('su-button');
    const iuButton = document.getElementById('iu-button');
    const generationDisplay = document.getElementById('generation-display');

    // Set the Pokémon name and generation display
    pokemonNameElement.textContent = capitalize(pokemonName);
    generationDisplay.textContent = `Generation ${generation}`;

    // Fetch analysis data from pokemonData.json
    fetch('pokemonData.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch analysis data.');
            }
            return response.json();
        })
        .then(data => {
            // Save the data to the pokemonData variable
            pokemonData = data;

            // Check if the analysis data for the Pokemon exists
            if (pokemonData[`generation${generation}`] && pokemonData[`generation${generation}`][pokemonName]) {
                // Parse the SU analysis text
                const suAnalysisText = pokemonData[`generation${generation}`][pokemonName].su_analysis;
                const suAnalysisContent = parseAnalysisText(suAnalysisText);

                // Parse the IU analysis text
                const iuAnalysisText = pokemonData[`generation${generation}`][pokemonName].iu_analysis;
                const iuAnalysisContent = parseAnalysisText(iuAnalysisText);

                // Function to create analysis boxes
                const createAnalysisBoxes = (analysisArray) => {
                    return analysisArray.join('');
                };

                // Set default analysis to SU tier
                suAnalysis.innerHTML = createAnalysisBoxes(suAnalysisContent);
                iuAnalysis.innerHTML = createAnalysisBoxes(iuAnalysisContent);

                // Set analysis for SU tier
                suButton.addEventListener('click', function() {
                    suAnalysisContainer.style.display = 'block';
                    iuAnalysisContainer.style.display = 'none';
                });

                // Set analysis for IU tier
                iuButton.addEventListener('click', function() {
                    suAnalysisContainer.style.display = 'none';
                    iuAnalysisContainer.style.display = 'block';
                });

                // Initially show SU analysis and hide IU analysis
                suAnalysisContainer.style.display = 'block';
                iuAnalysisContainer.style.display = 'none';
            } else {
                suAnalysis.textContent = 'No SU analysis available.';
                iuAnalysis.textContent = 'No IU analysis available.';
            }
        })
        .catch(error => {
            console.error('Error fetching analysis data:', error);
        });

    // Fetch data from PokeAPI
    fetchPokemonDetails(pokemonName)
        .then(data => {
            if (!data) {
                // Fallback to base form data if specific form data is not found
                const baseFormName = pokemonName.split('-')[0];
                return fetchPokemonDetails(baseFormName);
            }
            return data;
        })
        .then(data => {
            if (data) {
                // Set sprite
                sprite.src = data.sprites.front_default;

                // Set stats
                const statsList = data.stats ? data.stats.map(stat => `<li>${capitalize(stat.stat.name)}: ${stat.base_stat}</li>`).join('') : 'Unknown';
                stats.innerHTML = statsList;

                // Set typing
                const types = data.types ? data.types.map(type => capitalize(type.type.name)).join(' / ') : 'Unknown';
                typing.textContent = types;

                // Set abilities
                const abilityNames = data.abilities ? data.abilities.map(ability => capitalize(ability.ability.name)).join(', ') : 'Unknown';
                abilities.textContent = abilityNames;
            }
        })
        .catch(error => {
            console.error('Error fetching Pokemon details:', error);
        });

    // Function to fetch Pokemon details from PokeAPI
    async function fetchPokemonDetails(pokemonName) {
        try {
            let response;
            if (pokemonName.includes('-')) {
                // Fetch from the pokemon-form endpoint for alternative forms
                response = await fetch(`https://pokeapi.co/api/v2/pokemon-form/${pokemonName}`);
            } else {
                // Fetch from the pokemon endpoint for base forms
                response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
            }

            if (!response.ok) {
                // Fallback to base form data if specific form data is not found
                const baseFormName = pokemonName.split('-')[0];
                response = await fetch(`https://pokeapi.co/api/v2/pokemon/${baseFormName}`);
                if (!response.ok) {
                    console.error(`Failed to fetch details for ${pokemonName} or its base form.`);
                    return null;
                }
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error fetching details for ${pokemonName}:`, error);
            return null;
        }
    }

    // Function to parse analysis text
    function parseAnalysisText(analysisText) {
        const analysisParts = analysisText.split(/(<sdimportable>.*?<\/sdimportable>)/gs);
        return analysisParts.map(part => {
            if (part.startsWith('<sdimportable>')) {
                const content = part.replace(/<sdimportable>|<\/sdimportable>/g, '').trim();
                return content ? `<div class="analysis-box">${content.replace(/\n/g, '<br>')}</div>` : '';
            } else {
                return part.replace(/\n/g, '<br>');
            }
        });
    }

    // Function to capitalize the first letter of each word
    function capitalize(str) {
        return str.replace(/\b\w/g, char => char.toUpperCase());
    }

    // Event listener for the back button
    backButton.addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    // Set dark mode based on localStorage
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'disabled') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }

    // Retrieve and display additional data from localStorage
    const types = localStorage.getItem('pokemonTypes');
    const abilitiesList = localStorage.getItem('pokemonAbilities');
    const statsList = localStorage.getItem('pokemonStats');

    if (types) {
        typing.textContent = types;
    }

    if (abilitiesList) {
        abilities.textContent = abilitiesList;
    }

    if (statsList) {
        try {
            if (statsList && statsList !== 'undefined') {
                const statsJson = JSON.parse(statsList);
                const statsHtml = statsJson.map(stat => `<li>${capitalize(stat.stat.name)}: ${stat.base_stat}</li>`).join('');
                stats.innerHTML = statsHtml;
            }
        } catch (e) {
            console.error('Error parsing stats JSON:', e);
        }
    }
});