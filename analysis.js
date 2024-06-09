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
    const pokemonTierElement = document.getElementById('pokemon-tier');

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
            const pokemonData = data;

            // Check if the analysis data for the Pokemon exists
            if (pokemonData[`generation${generation}`] && pokemonData[`generation${generation}`][pokemonName]) {
                const pokemonDetails = pokemonData[`generation${generation}`][pokemonName];

                // Parse the SU analysis text
                const suAnalysisText = pokemonDetails.su_analysis;
                const suAnalysisContent = parseAnalysisText(suAnalysisText);

                // Parse the IU analysis text
                const iuAnalysisText = pokemonDetails.iu_analysis;
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

                // Initially show analysis of the tier the Pokemon is in by default
                if (pokemonDetails.tier === 'su') {
                    suAnalysisContainer.style.display = 'block';
                    iuAnalysisContainer.style.display = 'none';
                } else if (pokemonDetails.tier === 'iu') {
                    suAnalysisContainer.style.display = 'none';
                    iuAnalysisContainer.style.display = 'block';
                } else {
                    suAnalysisContainer.style.display = 'block';
                    iuAnalysisContainer.style.display = 'none';
                }

                // Set tier
                const pokemonTier = pokemonDetails.tier;
                pokemonTierElement.textContent = pokemonTier ? pokemonTier : 'Other';
            } else {
                suAnalysis.textContent = 'No SU analysis available.';
                iuAnalysis.textContent = 'No IU analysis available.';
            }
        })
        .catch(error => {
            console.error('Error fetching analysis data:', error);
        });

    // Fetch data from Pokemon Showdown
    fetchPokemonDetails(pokemonName)
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
            // Set sprite URL based on generation
            let spriteUrl;
            if (generation == 5) {
                spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5ani/${data.name.toLowerCase().replace(/ /g, '')}.gif`;
            } else if (generation < 5) {
                spriteUrl = `https://play.pokemonshowdown.com/sprites/gen${generation}/${data.name.toLowerCase().replace(/ /g, '')}.png`;
            } else {
                spriteUrl = `https://play.pokemonshowdown.com/sprites/ani/${data.name.toLowerCase().replace(/ /g, '')}.gif`;
            }
            sprite.src = spriteUrl;

            // Set stats
            const statsList = data.baseStats ? Object.entries(data.baseStats).map(([stat, value]) => `<li>${capitalize(stat)}: ${value}</li>`).join('') : 'Unknown';
            stats.innerHTML = statsList;

            // Set typing
            const selectedTypeIcons = localStorage.getItem('typeIcons') || 'gen5';
            const types = data.types ? data.types.map(type => `<img src="types/${selectedTypeIcons}/${type}.png" alt="${capitalize(type)}"></img>`).join(' ') : 'Unknown';
            typing.innerHTML = types;

            // Set abilities
            let abilityNames = 'Unknown';
            if (data.abilities) {
                if (Array.isArray(data.abilities)) {
                    abilityNames = data.abilities.map(ability => capitalize(ability.name)).join(', ');
                } else if (typeof data.abilities === 'object') {
                    const abilityValues = Object.values(data.abilities);
                    abilityNames = abilityValues.map(ability => capitalize(ability)).join(', ');
                }
            }
            abilities.textContent = abilityNames;

            // Attempt to fetch and set the tier from localStorage if available
            const tierData = localStorage.getItem('tierData');
            if (tierData) {
                const tierDataParsed = JSON.parse(tierData);
                const tier = tierDataParsed[`generation${generation}`]?.[pokemonName]?.tier;
                if (tier) {
                    pokemonTierElement.textContent = capitalize(tier);
                } else {
                    pokemonTierElement.textContent = 'Other';
                }
            }
        }
    })
    .catch(error => {
        console.error('Error fetching Pokemon details:', error);
    });

    // Function to fetch Pokemon details from Pokemon Showdown
    async function fetchPokemonDetails(pokemonName) {
        try {
            const response = await fetch(`https://play.pokemonshowdown.com/data/pokedex.json`);
            if (!response.ok) {
                console.error(`Failed to fetch details for ${pokemonName}.`);
                return null;
            }
    
            const data = await response.json();
            let pokemonData = data[pokemonName.toLowerCase()];
    
            // If the Pokémon data is not found with the original name
            if (!pokemonData) {
                // Check if the name contains special characters
                const hasSpecialChars = /[^a-zA-Z0-9]/.test(pokemonName);
    
                // If it has special characters, try removing them
                if (hasSpecialChars) {
                    const nameWithoutSpecialChars = pokemonName.replace(/[^a-zA-Z0-9']/g, '').replace(/ /g, '');
                    pokemonData = data[nameWithoutSpecialChars.toLowerCase()] || null;
                }
    
                // If the Pokémon data is still not found, it might be an alternative form
                if (!pokemonData && pokemonName.includes('-')) {
                    const baseFormName = pokemonName.split('-')[0];
                    pokemonData = data[baseFormName.toLowerCase()] || null;
                }
            }
    
            if (!pokemonData) {
                console.error(`No data found for ${pokemonName}.`);
                return null;
            }
    
            return pokemonData;
        } catch (error) {
            console.error(`Error fetching details for ${pokemonName}:`, error);
            return null;
        }
    }
    

    // Function to parse analysis text
    function parseAnalysisText(analysisText) {
        const analysisParts = analysisText.split(/(<sdimportable>.*?<\/sdimportable>|<title>.*?<\/title>)/gs);
        return analysisParts.map(part => {
            if (part.startsWith('<sdimportable>')) {
                const content = part.replace(/<sdimportable>|<\/sdimportable>/g, '').trim();
                return content ? `<div class="analysis-box">${content.replace(/\n/g, '<br>')}</div>` : '';
            } else if (part.startsWith('<title>')) {
                const content = part.replace(/<title>|<\/title>/g, '').trim();
                return content ? `<div class="title-box">${content.replace(/\n/g, '<br>')}</div>` : '';
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
            const statsJson = JSON.parse(statsList);
            if (Array.isArray(statsJson)) {
                const statsHtml = statsJson.map(stat => `<li>${capitalize(stat.stat.name)}: ${stat.base_stat}</li>`).join('');
                stats.innerHTML = statsHtml;
            } else {
                // Handle the case where statsJson is not an array
                const statsEntries = Object.entries(statsJson);
                const statsHtml = statsEntries.map(([stat, value]) => `<li>${capitalize(stat)}: ${value}</li>`).join('');
                stats.innerHTML = statsHtml;
            }
        } catch (e) {
            console.error('Error parsing stats JSON:', e);
        }
    }    
});
