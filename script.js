document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const generationSelect = document.getElementById('generationSelect');
    const settingsButton = document.getElementById('settingsButton');
    const settingsMenu = document.getElementById('settingsMenu');
    const toggleDarkModeButton = document.getElementById('toggleDarkMode');
    const typeIconsRadioButtons = document.querySelectorAll('input[name="typeIcons"]');
    let pokemonList = [];
    let debounceTimer;
    let tierData;

    async function generateGenerationOptions(selectElement) {
        const totalGenerations = 9;
        for (let i = 1; i <= totalGenerations; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Generation ${i}`;
            selectElement.appendChild(option);
        }
    }

    async function fetchPokemonList() {
        try {
            const response = await fetch('https://play.pokemonshowdown.com/data/pokedex.json');
            if (!response.ok) {
                console.error('Failed to fetch Pokémon list from Pokémon Showdown.');
                return;
            }
            const data = await response.json();
            pokemonList = Object.keys(data).map(pokemon => pokemon.toLowerCase());
        } catch (error) {
            console.error('Error fetching Pokémon list:', error);
        }
    }

    async function fetchPokemonDetails(pokemonName, generation) {
        try {
            const response = await fetch('https://play.pokemonshowdown.com/data/pokedex.json');
            if (!response.ok) {
                console.error('Failed to fetch Pokémon details from Pokémon Showdown.');
                return null;
            }
            const data = await response.json();
            let pokemonData = data[pokemonName.toLowerCase()] || null;
    
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
    
            // If the Pokémon data has a baseForme property, it means it has alternative forms
            // If it doesn't have a baseForme property, it means it is the base form
            if (pokemonData && (pokemonData.baseForme || !pokemonData.hasOwnProperty('baseForme'))) {
                let spriteUrl;
                if (pokemonData.spriteName) {
                    const spriteName = pokemonData.spriteName.toLowerCase().replace(/[^a-zA-Z0-9']/g, '').replace(/ /g, '');
                    spriteUrl = `https://play.pokemonshowdown.com/sprites/gen${generation}/${spriteName}.png`;
                } else if (!pokemonData.baseForme) {
                    const nameWithoutSpecialChars = pokemonData.name.toLowerCase().replace(/[^a-zA-Z0-9']/g, '').replace(/ /g, '');
                    spriteUrl = `https://play.pokemonshowdown.com/sprites/gen${generation}/${nameWithoutSpecialChars}.png`;
                }
                pokemonData.spriteUrl = spriteUrl;
                return pokemonData;
            }
    
            return null;
        } catch (error) {
            console.error(`Error fetching details for ${pokemonName} in generation ${generation}:`, error);
            return null;
        }
    }    

    async function fetchTierData() {
        try {
            const response = await fetch('pokemonData.json');
            if (!response.ok) {
                console.error('Failed to fetch tier data.');
                return;
            }
            tierData = await response.json();
        } catch (error) {
            console.error('Error fetching tier data:', error);
        }
    }

    function handleSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (searchTerm.length >= 2 && /^[a-z-]+$/.test(searchTerm)) {
                const results = performFuzzySearch(searchTerm);
                displaySearchResults(results);
            } else {
                searchResults.innerHTML = '';
            }
        }, 300);
    }

    function performFuzzySearch(term) {
        const fuse = new Fuse(pokemonList, { threshold: 0.4 });
        return fuse.search(term);
    }

    async function displaySearchResults(results) {
        let html = '';
        const uniqueResults = new Set(); // Use a Set to store unique Pokémon names
    
        for (const result of results) {
            const pokemonName = result.item;
            if (uniqueResults.has(pokemonName)) continue; // Skip if already processed
            uniqueResults.add(pokemonName);
    
            let pokemonData = await fetchPokemonDetails(pokemonName);
    
            if (pokemonData) {
                const generation = generationSelect.value;
                const pokemonTier = tierData[`generation${generation}`][pokemonName]?.tier ? capitalize(tierData[`generation${generation}`][pokemonName].tier) : 'Other';
                const types = pokemonData.types ? pokemonData.types.map(type => capitalize(type)).join(' / ') : 'Unknown';
    
                // Adjusting how abilities are accessed and separated by "/"
                let abilities = 'Unknown';
                if (pokemonData.abilities) {
                    const abilityArray = Object.values(pokemonData.abilities);
                    abilities = abilityArray.map(ability => capitalize(ability)).join(' / ');
                }
    
                // Set sprite URL
                const spriteUrl = `https://play.pokemonshowdown.com/sprites/ani/${pokemonData.name.toLowerCase().replace(/ /g, '')}.gif`;

                // Set type icons based on selected type icon set
                const selectedTypeIcons = localStorage.getItem('typeIcons') || 'gen5'; // Default to 'gen5' if not set
                const typeIconsHtml = pokemonData.types ? pokemonData.types.map(type => `<img src="types/${selectedTypeIcons}/${type}.png" alt="${capitalize(type)}" class="type-icon-small"></img>`).join(' ') : 'Unknown';
    
                html += `
                <div class="pokemon" data-pokemon="${pokemonData.name.toLowerCase()}" data-types="${types}" data-abilities="${abilities}" data-stats='${JSON.stringify(pokemonData.baseStats)}'>
                    <h2 class="pokemon-name">${capitalize(pokemonData.name)}</h2>
                    <img src="${spriteUrl}" alt="${pokemonData.name}" class="pokemon-sprite">
                    <div class="pokemon-details">
                        <p>Typing: ${typeIconsHtml}</p>
                        <p>Abilities: ${abilities}</p>
                        <p>Tier: ${capitalize(pokemonTier)}</p>
                    </div>
                </div>
            `;
            }
        }
        searchResults.innerHTML = html;
    }    

    function redirectToAnalysis(clickedPokemonName, spriteUrl) {
        const selectedGeneration = generationSelect.value;
        const clickedPokemonElement = document.querySelector(`.pokemon[data-pokemon="${clickedPokemonName}"]`);
        const types = clickedPokemonElement.getAttribute('data-types');
        const abilities = clickedPokemonElement.getAttribute('data-abilities');
        const stats = clickedPokemonElement.getAttribute('data-stats');
    
        localStorage.setItem('selectedGeneration', selectedGeneration);
        localStorage.setItem('pokemonTypes', types);
        localStorage.setItem('pokemonAbilities', abilities);
        localStorage.setItem('pokemonStats', stats);
        localStorage.setItem('tierData', JSON.stringify(tierData));
        localStorage.setItem('typeIcons', document.querySelector('input[name="typeIcons"]:checked').value);
        localStorage.setItem('pokemonSprite', spriteUrl); // Store the sprite URL
    
        window.location.href = `analysis.html?pokemon=${clickedPokemonName}&generation=${selectedGeneration}`;
    }

    function toggleDarkMode() {
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
        toggleDarkModeButton.setAttribute('aria-pressed', isDarkMode);
    }

    settingsButton.addEventListener('click', function() {
        settingsMenu.classList.toggle('show-settings');
    });

    typeIconsRadioButtons.forEach(radioButton => {
        radioButton.addEventListener('change', function() {
            const selectedTypeIcons = document.querySelector('input[name="typeIcons"]:checked').value;
            localStorage.setItem('typeIcons', selectedTypeIcons);
        });
    });

    function capitalize(str) {
        if (typeof str !== 'string') {
            return '';
        }
        return str.replace(/\b\w/g, char => char.toUpperCase());
    }

    searchInput.addEventListener('input', handleSearchInput);

    searchResults.addEventListener('click', function(event) {
        const pokemonElement = event.target.closest('.pokemon');
        if (pokemonElement) {
            const clickedPokemonName = pokemonElement.dataset.pokemon;
            redirectToAnalysis(clickedPokemonName);
        }
    });

    toggleDarkModeButton.addEventListener('click', toggleDarkMode);

    fetchTierData();
    fetchPokemonList();
    generateGenerationOptions(generationSelect);

    const selectedGeneration = localStorage.getItem('selectedGeneration');
    if (selectedGeneration) {
        generationSelect.value = selectedGeneration;
    }

    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'disabled') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }

    const storedTypeIcons = localStorage.getItem('typeIcons');
    if (storedTypeIcons) {
        document.querySelector(`input[name="typeIcons"][value="${storedTypeIcons}"]`).checked = true;
    }
});
