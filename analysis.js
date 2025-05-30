document.addEventListener('DOMContentLoaded', function() {
    // Get the Pokemon name and generation from the URL query parameters
    const params = new URLSearchParams(window.location.search);
    const pokemonName = params.get('pokemon');

    // Get elements
    const pokemonNameElement = document.getElementById('pokemon-name');
    const sprite = document.getElementById('pokemon-sprite');
    const stats = document.getElementById('pokemon-stats');
    const typing = document.getElementById('pokemon-typing');
    const abilities = document.getElementById('pokemon-abilities');
    const backButton = document.getElementById('back-button');
    //const pokemonTierElement = document.getElementById('pokemon-tier');

    let abilitiesJson = {};
    let movesJson = {};

    Promise.all([
        fetch('https://play.pokeathlon.com/data/abilities.json').then(r => r.json()),
        fetch('https://play.pokeathlon.com/data/moves.json').then(r => r.json())
    ]).then(([abilitiesData, movesData]) => {
        abilitiesJson = abilitiesData;
        movesJson = movesData;
    });


    // Set the Pokémon name and generation display
    pokemonNameElement.textContent = capitalize(pokemonName);

    // Fetch analysis data from pokemonData.json
    /*fetch('pokemonData.json')
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
            } else {
                suAnalysis.textContent = 'No SU analysis available.';
                iuAnalysis.textContent = 'No IU analysis available.';
            }
        })
        .catch(error => {
            console.error('Error fetching analysis data:', error);
        });*/

    // Fetch data from Pokemon Showdown
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
            let spriteUrl = getSpriteURL(data);
            sprite.src = spriteUrl;

            // Set stats
            const statsList = data.baseStats
            ? Object.entries(data.baseStats).map(([stat, value]) => {
                const barColor = getStatColor(value);
                const barWidth = (value / 255) * 100;
                return `
                    <li style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="width: 80px;">${capitalize(stat)}</span>
                    <span style="width: 40px; text-align: right; margin-right: 10px;">${value}</span>
                    <div style="flex-grow: 1; height: 12px; border-radius: 4px; overflow: hidden; background: transparent;">
                        <div style="width: ${barWidth}%; height: 100%; background: ${barColor};"></div>
                    </div>
                    </li>`;
                }).join('')
            : 'Unknown';

            stats.innerHTML = statsList;

            // Set typing
            const types = data.types ? data.types.map(type => `<img src="https://play.pokeathlon.com/fx/types/${type}.png" alt="${capitalize(type)}"></img>`).join(' ') : 'Unknown';
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
            if (typeof data.abilities === 'object') {
                const abilityValues = Object.values(data.abilities);
                abilities.innerHTML = abilityValues.map(abilityName => {
                    const id = toID(abilityName);
                    const ability = abilitiesJson[id];  // You'll need to load this JSON
                    return `<span class="hover-ability" data-id="${id}">${capitalize(abilityName)}</span>`;
                }).join(', ');
            }

            const movepoolElement = document.getElementById('pokemon-movepool');

            fetch('https://play.pokeathlon.com/data/learnsets.json')
                .then(response => response.json())
                .then(learnsetData => {
                    // Try to get exact match
                    let learnsetEntry = learnsetData[toID(pokemonName)];

                    if (!learnsetEntry && pokemonName.includes('-')) {
                        // Try stripping one suffix at a time from the end
                        const parts = pokemonName.split('-');
                        for (let i = parts.length - 1; i > 0; i--) {
                            const partialName = parts.slice(0, i).join('-');
                            learnsetEntry = learnsetData[toID(partialName)];
                            if (learnsetEntry) break;
                        }
                        // If still not found, fallback to species name only
                        if (!learnsetEntry) {
                            learnsetEntry = learnsetData[toID(parts[0])];
                        }
                    }

                    if (learnsetEntry && learnsetEntry.learnset) {
                        const moveNames = Object.keys(learnsetEntry.learnset)
                            .map(moveID => {
                                const move = movesJson[toID(moveID)];
                                const moveName = move ? move.name : capitalize(moveID.replace(/-/g, ' '));
                                return `<li><span class="hover-move" data-id="${toID(moveID)}">${moveName}</span></li>`;
                            })
                            .sort()
                            .join('');

                        movepoolElement.innerHTML = `<h3>Movepool</h3><ul>${moveNames}</ul>`;
                    } else {
                        movepoolElement.innerHTML = '<p>No movepool data available.</p>';
                    }
                })
                .catch(error => {
                    console.error('Error fetching learnset data:', error);
                    movepoolElement.textContent = 'Error loading movepool.';
                });

            // Attempt to fetch and set the tier from localStorage if available
            /*const tierData = localStorage.getItem('tierData');
            if (tierData) {
                const tierDataParsed = JSON.parse(tierData);
                const tier = tierDataParsed[`generation${generation}`]?.[pokemonName]?.tier;
                if (tier) {
                    pokemonTierElement.textContent = capitalize(tier);
                } else {
                    pokemonTierElement.textContent = 'Other';
                }
            }*/
        }
    })
    .catch(error => {
        console.error('Error fetching Pokemon details:', error);
    });

    // Function to fetch Pokemon details from Pokemon Showdown
    async function fetchPokemonDetails(pokemonName) {
        try {
            const response = await fetch(`https://play.pokeathlon.com/data/pokedex.json`);
            if (!response.ok) {
                console.error(`Failed to fetch details for ${pokemonName}.`);
                return null;
            }
    
            const data = await response.json();
            const pokemonData = data[toID(pokemonName)];
    
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
    /*function parseAnalysisText(analysisText) {
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
    }*/
    
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

    function getSpriteURL(entry) {
        for (const fangame of ['Insurgence', 'Uranium', 'Infinity', 'Mariomon', 'Pokeathlon', 'Infinite Fusion']) {
            if (entry.tags && entry.tags.includes(fangame)) {
                return 'https://play.pokeathlon.com/sprites/fangame-sprites/' + toID(fangame) + '/front/' + toID(entry.name) + (fangame === 'Pokeathlon' ? '.gif' : '.png');
            }
        }
        if (entry.baseSpecies && entry.forme) {
            return 'https://play.pokemonshowdown.com/sprites/gen5/' + toID(entry.baseSpecies) + '-' + toID(entry.forme) + '.png';
        }
        return 'https://play.pokemonshowdown.com/sprites/gen5/' + toID(entry.name) + '.png';
    }

    function toID(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
    }

    function getStatColor(stat) {
        if (stat <= 100) {
            const g = Math.floor((stat / 100) * 255);
            return `rgb(255, ${g}, 0)`; // red to green
        } else if (stat <= 200) {
            const b = Math.floor(((stat - 100) / 100) * 255);
            return `rgb(${255 - b}, 255, ${b})`; // green to light blue
        } else {
            const purple = Math.min(255, Math.floor(((stat - 200) / 55) * 255));
            return `rgb(${200 - purple / 3}, ${100 - purple / 2}, ${200})`; // light blue to purple
        }
    }

    function showTooltip(content, x, y) {
        const tooltip = document.getElementById('tooltip');
        tooltip.innerHTML = content;
        tooltip.style.left = x + 10 + 'px';
        tooltip.style.top = y + 10 + 'px';
        tooltip.style.display = 'block';
    }

    function hideTooltip() {
        document.getElementById('tooltip').style.display = 'none';
    }
    

    document.addEventListener('mouseover', function(e) {
        if (e.target.classList.contains('hover-ability')) {
            const ability = abilitiesJson[e.target.dataset.id];
            const html = `
                <strong>${ability.name}</strong><br>
                ${ability.desc || ability.shortDesc || "No description."}
            `;
            showTooltip(html, e.pageX, e.pageY);
        }
    });
    document.addEventListener('mouseout', function(e) {
        if (e.target.classList.contains('hover-ability')) {
            hideTooltip();
        }
    });

    document.addEventListener('mouseover', function(e) {
        if (e.target.classList.contains('hover-move')) {
            const move = movesJson[e.target.dataset.id];
            const html = `
                <strong>${move.name}</strong><br>
                <img src=https://play.pokeathlon.com/fx/types/${move.type}.png> <img src=https://play.pokemonshowdown.com/sprites/categories/${move.category}.png><br>
                <strong>Power:</strong> ${move.basePower ?? '-'}<br>
                <strong>Accuracy:</strong> ${move.accuracy === true ? '—' : move.accuracy}<br>
                <strong>PP:</strong> ${move.pp}<br>
                ${move.desc || move.shortDesc || "No description."}
            `;
            showTooltip(html, e.pageX, e.pageY);
        }
    });
    document.addEventListener('mouseout', function(e) {
        if (e.target.classList.contains('hover-move')) {
            hideTooltip();
        }
    });
});
