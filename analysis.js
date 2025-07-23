// Helper: get chaos override data for a given name
function getChaosOverrideData(name, chaosData) {
    if (!chaosData || !chaosData.gen9chaos) return null;
    const { overrideSpeciesData } = chaosData.gen9chaos;
    if (!overrideSpeciesData) return null;
    let override = overrideSpeciesData[toID(name)];
    if (!override && name.includes('-')) {
        // Try stripping one suffix at a time from the end
        const parts = name.split('-');
        for (let i = parts.length - 1; i > 0; i--) {
            const partialName = parts.slice(0, i).join('-');
            if (overrideSpeciesData[toID(partialName)]) {
                override = overrideSpeciesData[toID(partialName)];
                break;
            }
        }
    }
    return override || null;
}

// Helper: get chaos learnset for a given name, robust to dashed/collapsed forms
function getChaosLearnset(name, chaosData) {
    if (!chaosData || !chaosData.gen9chaos) return null;

    const learnsets = chaosData.gen9chaos.learnsets || {};
    const overrideLearnsets = chaosData.gen9chaos.overrideLearnsets || {};

    // First priority: exact match in overrideLearnsets
    const exactID = toID(name);
    if (overrideLearnsets[exactID]) return overrideLearnsets[exactID];
    if (learnsets[exactID]) return learnsets[exactID];

    return null;
}
document.addEventListener('DOMContentLoaded', function () {
    // Get the Pokemon name from the URL
    const params = new URLSearchParams(window.location.search);
    const pokemonName = params.get('pokemon');
    const pokemonNameElement = document.getElementById('pokemon-name');
    const sprite = document.getElementById('pokemon-sprite');
    let abilitiesJson = {}, movesJson = {}, itemsJson = {};

    // Preload ability, move, and item data
    Promise.all([
        fetch('https://play.pokeathlon.com/data/abilities.json').then(r => r.json()),
        fetch('https://play.pokeathlon.com/data/moves.json').then(r => r.json()),
        fetch('https://play.pokeathlon.com/data/items.json').then(r => r.json())
    ]).then(([abilitiesData, movesData, itemsData]) => {
        abilitiesJson = abilitiesData;
        movesJson = movesData;
        itemsJson = itemsData;
    });

    // Back button
    const backButton = document.getElementById('back-button');
    backButton.style.position = 'fixed';
    backButton.style.top = '24px';
    backButton.style.left = '24px';
    backButton.style.zIndex = 1002;
    backButton.onclick = () => window.location.href = 'index.html';

    // Set Pokémon name
    pokemonNameElement.textContent = capitalize(pokemonName);

    // Fetch chaos mod overrides
    const chaosDataPromise = fetch('https://play.pokeathlon.com/data/teambuilder-tables.json').then(r => r.json()).catch(() => null);

    // Main fetch and render logic
    fetchPokemonDetails(pokemonName)
        .then(data => data || fetchPokemonDetails(pokemonName.split('-')[0]))
        .then(async data => {
            let chaosData = await chaosDataPromise;
            let overrideSpecies = null;
            if (chaosData && chaosData.gen9chaos && chaosData.gen9chaos.overrideSpeciesData) {
                const overrideKey = toID(pokemonName);
                if (chaosData.gen9chaos.overrideSpeciesData[overrideKey]) {
                    overrideSpecies = chaosData.gen9chaos.overrideSpeciesData[overrideKey];
                }
            }
            let currentFormObj = Object.assign({}, data, overrideSpecies || {});
            let tierText = '';
            if (chaosData && chaosData.gen9chaos) {
                if (chaosData.gen9chaos.overrideTier && chaosData.gen9chaos.overrideTier[toID(pokemonName)]) {
                    tierText = `<span style='color:#e0b000;font-weight:bold;'>${chaosData.gen9chaos.overrideTier[toID(pokemonName)]}</span>`;
                } else if (chaosData.gen9chaos.tiers && chaosData.gen9chaos.tiers[toID(pokemonName)]) {
                    tierText = `<span style='color:#e0b000;font-weight:bold;'>${chaosData.gen9chaos.tiers[toID(pokemonName)]}</span>`;
                }
            }
            if (overrideSpecies) data = Object.assign({}, data, overrideSpecies);
            if (!data) return;

            // Set sprite
            let fangame = null;
            for (const fg of ['Insurgence', 'Uranium', 'Infinity', 'Mariomon', 'Pokeathlon']) {
                if (data.tags && data.tags.includes(fg)) { fangame = fg; break; }
            }
            sprite.src = getSpriteURL(data);
            if (fangame) sprite.setAttribute('data-fangame', fangame);
            else sprite.removeAttribute('data-fangame');

            // Stat bar and form rendering
            const detailsContainer = document.querySelector('.pokemon-details');
            const formsColumn = document.createElement('div');
            formsColumn.style.display = 'flex';
            formsColumn.style.flexDirection = 'column';
            formsColumn.style.alignItems = 'center';
            formsColumn.style.width = '100%';

            let effectiveName = pokemonName;
            if (overrideSpecies && overrideSpecies.name && overrideSpecies.name.length > pokemonName.length) {
                effectiveName = overrideSpecies.name;
            } else if (data && data.name && data.name.length > pokemonName.length) {
                effectiveName = data.name;
            }
            currentFormObj.name = effectiveName;
            currentFormObj._chaosLearnset = getChaosLearnset(effectiveName, chaosData);
            let currentFangame = null;
            for (const fg of ['Insurgence', 'Uranium', 'Infinity', 'Mariomon', 'Pokeathlon']) {
                if (currentFormObj.tags && currentFormObj.tags.includes(fg)) { currentFangame = fg; break; }
            }
            formsColumn.appendChild(createFormCard(currentFormObj, currentFangame, true));

            // Stat bars in static <ul>
            const staticStatsUl = document.getElementById('pokemon-stats');
            if (staticStatsUl && currentFormObj.baseStats) {
                staticStatsUl.innerHTML = '';
                for (const [stat, value] of Object.entries(currentFormObj.baseStats)) {
                    const statBarHtml = createStatBar(stat, value);
                    const li = document.createElement('li');
                    li.innerHTML = statBarHtml;
                    staticStatsUl.appendChild(li);
                }
            }

            // Special forms
            try {
                const pokedexResp = await fetch('https://play.pokeathlon.com/data/pokedex.json');
                const pokedex = await pokedexResp.json();
                let currentBase = data.baseSpecies ? toID(data.baseSpecies) : toID(data.name);
                for (const key in pokedex) {
                    const entry = pokedex[key];
                    if (
                        entry.baseSpecies &&
                        entry.forme &&
                        (entry.requiredItem || entry.requiredAbility) &&
                        toID(entry.baseSpecies) === currentBase &&
                        toID(entry.name) !== toID(data.name)
                    ) {
                        let specialOverride = getChaosOverrideData(entry.name, chaosData);
                        let specialLearnset = getChaosLearnset(entry.name, chaosData);
                        let specialEntry = Object.assign({}, entry, specialOverride || {});
                        specialEntry._chaosLearnset = specialLearnset;
                        let specialFangame = null;
                        for (const fg of ['Insurgence', 'Uranium', 'Infinity', 'Mariomon', 'Pokeathlon']) {
                            if (specialEntry.tags && specialEntry.tags.includes(fg)) { specialFangame = fg; break; }
                        }
                        formsColumn.appendChild(createFormCard(specialEntry, specialFangame, false));
                    }
                }
            } catch (e) {}

            if (detailsContainer) {
                detailsContainer.innerHTML = '';
                detailsContainer.appendChild(formsColumn);
                detailsContainer.style.display = 'flex';
                detailsContainer.style.alignItems = 'center';
                detailsContainer.style.justifyContent = 'center';
            }

            // Movepool rendering (current form only)
            const movepoolElement = document.getElementById('pokemon-movepool');
            function renderLearnset(learnsetObj) {
                if (!learnsetObj) {
                    movepoolElement.innerHTML = '<p>No movepool data available.</p>';
                    return;
                }
                const moveNames = Object.keys(learnsetObj)
                    .map(moveID => {
                        const move = movesJson[toID(moveID)];
                        const moveName = move ? move.name : capitalize(moveID.replace(/-/g, ' '));
                        const typeIcon = move ? `<img src="https://play.pokeathlon.com/fx/types/${move.type}.png" alt="${move.type}" class="move-type-icon" style="vertical-align:middle;margin-left:8px;">` : '';
                        const catIcon = move ? `<img src="https://play.pokemonshowdown.com/sprites/categories/${move.category}.png" alt="${move.category}" class="move-cat-icon" style="vertical-align:middle;margin-left:4px;">` : '';
                        const power = move ? (move.basePower ?? '-') : '-';
                        const accuracy = move ? (move.accuracy === true ? '—' : move.accuracy) : '-';
                        const pp = move ? move.pp : '-';
                        const desc = move ? (move.shortDesc || move.desc || "No description.") : "No description.";
                        return `<li style="display:flex;align-items:flex-start;padding:8px 0;border-bottom:1px solid #eee;"><div style="flex:1;"><span class="hover-move" data-id="${toID(moveID)}" style="font-weight:bold;cursor:pointer;">${moveName}</span>${typeIcon}${catIcon}<div style="font-size:13px;margin-top:2px;"><strong>Power:</strong> ${power} &nbsp; <strong>Accuracy:</strong> ${accuracy} &nbsp; <strong>PP:</strong> ${pp}</div><div style="font-size:13px;margin-top:2px;opacity:0.75;">${desc}</div></div></li>`;
                    })
                    .sort()
                    .join('');
                movepoolElement.innerHTML = `<h3>Movepool</h3><ul style="padding:0;list-style:none;margin:0;">${moveNames}</ul>`;
            }
            let learnsetToShow = getChaosLearnset(currentFormObj.name, chaosData);
            if (learnsetToShow && typeof learnsetToShow === 'object' && !Array.isArray(learnsetToShow)) {
                renderLearnset(learnsetToShow);
            } else {
                fetch('https://play.pokeathlon.com/data/learnsets.json')
                    .then(response => response.json())
                    .then(learnsetData => {
                        const name = currentFormObj.name;
                        const tried = new Set();
                        let candidates = [name];
                        if (name.includes('-')) candidates.push(name.replace(/-/g, ''));
                        if (name.includes('-')) {
                            const parts = name.split('-');
                            for (let i = parts.length - 1; i > 0; i--) {
                                const partialDashed = parts.slice(0, i).join('-');
                                const partialCollapsed = parts.slice(0, i).join('');
                                candidates.push(partialDashed);
                                if (partialDashed !== partialCollapsed) candidates.push(partialCollapsed);
                            }
                        }
                        let learnsetEntry = null;
                        for (const candidate of candidates) {
                            const id = toID(candidate);
                            if (tried.has(id)) continue;
                            tried.add(id);
                            if (learnsetData[id] && learnsetData[id].learnset) {
                                learnsetEntry = learnsetData[id].learnset;
                                break;
                            }
                        }
                        if (learnsetEntry) {
                            renderLearnset(learnsetEntry);
                        } else {
                            movepoolElement.innerHTML = '<p>No movepool data available.</p>';
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching learnset data:', error);
                        movepoolElement.textContent = 'Error loading movepool.';
                    });
            }

            // Evolution buttons
            if ((data.prevo || (Array.isArray(data.evos) && data.evos.length > 0))) {
                const floatContainer = document.createElement('div');
                floatContainer.style.position = 'fixed';
                floatContainer.style.bottom = '20px';
                floatContainer.style.right = '20px';
                floatContainer.style.zIndex = '1000';
                floatContainer.style.background = 'rgba(0, 0, 0, 1)';
                floatContainer.style.border = '1px solid #ccc';
                floatContainer.style.borderRadius = '8px';
                floatContainer.style.padding = '10px';
                floatContainer.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
                floatContainer.style.textAlign = 'center';
                const label = document.createElement('div');
                label.textContent = 'Evolutions';
                label.style.fontWeight = 'bold';
                label.style.marginBottom = '8px';
                floatContainer.appendChild(label);
                if (data.prevo) {
                    const prevoBtn = document.createElement('button');
                    prevoBtn.textContent = `⬅️ ${capitalize(data.prevo)}`;
                    prevoBtn.style.margin = '4px';
                    prevoBtn.onclick = () => {
                        window.location.href = `analysis.html?pokemon=${encodeURIComponent(data.prevo)}`;
                    };
                    floatContainer.appendChild(prevoBtn);
                }
                if (Array.isArray(data.evos) && data.evos.length > 0) {
                    data.evos.forEach(evoName => {
                        const evoBtn = document.createElement('button');
                        evoBtn.textContent = `${capitalize(evoName)} ➡️`;
                        evoBtn.style.margin = '4px';
                        evoBtn.onclick = () => {
                            window.location.href = `analysis.html?pokemon=${encodeURIComponent(evoName)}`;
                        };
                        floatContainer.appendChild(evoBtn);
                    });
                }
                document.body.appendChild(floatContainer);
            }
        })
        .catch(error => {
            console.error('Error fetching Pokemon details:', error);
        });

    // Fetch Pokemon details helper
    async function fetchPokemonDetails(pokemonName) {
        try {
            const response = await fetch(`https://play.pokeathlon.com/data/pokedex.json`);
            if (!response.ok) return null;
            const data = await response.json();
            return data[toID(pokemonName)] || null;
        } catch (error) {
            return null;
        }
    }

    // Sprite toggle button (UI only, logic can be added as needed)
    const spriteToggleBtn = document.createElement('button');
    spriteToggleBtn.id = 'spriteToggleBtn';
    spriteToggleBtn.style.position = 'fixed';
    spriteToggleBtn.style.top = '16px';
    spriteToggleBtn.style.right = '16px';
    spriteToggleBtn.style.background = 'none';
    spriteToggleBtn.style.border = 'none';
    spriteToggleBtn.style.cursor = 'pointer';
    spriteToggleBtn.style.zIndex = 1001;
    spriteToggleBtn.style.width = '48px';
    spriteToggleBtn.style.height = '48px';
    spriteToggleBtn.style.padding = '0';
    spriteToggleBtn.style.display = 'flex';
    spriteToggleBtn.style.alignItems = 'center';
    spriteToggleBtn.style.justifyContent = 'center';
    document.body.appendChild(spriteToggleBtn);

    // Quill rich text editor setup and analysis section logic
    let quill = null;
    const editBtn = document.getElementById('edit-analysis-btn');
    const analysisContent = document.getElementById('analysis-content');
    const editor = document.getElementById('analysis-editor');
    const saveBtn = document.getElementById('save-analysis-btn');
    const cancelBtn = document.getElementById('cancel-analysis-btn');

    function fetchAnalysis() {
        fetch(`/api/analysis/${encodeURIComponent(pokemonName)}`)
            .then((r) => r.json())
            .then(data => {
                if (data.analysis && data.analysis.html) {
                    analysisContent.innerHTML = data.analysis.html;
                    analysisContent.classList.add('ql-editor');
                    setTimeout(() => {
                        const codeBlocks = analysisContent.querySelectorAll('.ql-code-block');
                        codeBlocks.forEach((block) => {
                            if (!block.parentElement.classList.contains('codeblock-container')) {
                                const container = document.createElement('div');
                                container.className = 'codeblock-container';
                                container.style.position = 'relative';
                                container.style.background = '#181c24';
                                container.style.border = '1px solid #444';
                                container.style.borderRadius = '7px';
                                container.style.margin = '16px 0';
                                container.style.padding = '0 0 0 0';
                                if (block.parentElement.classList.contains('ql-code-block-container')) {
                                    const codeContainer = block.parentElement;
                                    if (!codeContainer.parentElement.classList.contains('codeblock-container')) {
                                        codeContainer.parentElement.insertBefore(container, codeContainer);
                                        container.appendChild(codeContainer);
                                    }
                                } else {
                                    block.parentElement.insertBefore(container, block);
                                    container.appendChild(block);
                                }
                            }
                        });
                    }, 0);
                } else {
                    analysisContent.innerHTML = '<em>No analysis available yet.</em>';
                    analysisContent.classList.remove('ql-editor');
                }
            });
    }
    fetchAnalysis();

    editBtn.onclick = function() {
        let password = localStorage.getItem('analysis_secret') || '';
        if (!password) {
            password = prompt('Enter admin password to edit:') || '';
            if (!password) return;
            localStorage.setItem('analysis_secret', password);
        }
        editor.style.display = 'block';
        analysisContent.style.display = 'none';
        editBtn.style.display = 'none';
        if (!quill) {
            quill = new Quill('#quill-editor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'link'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['code-block'],
                        ['clean']
                    ]
                }
            });
        }
        fetch(`/api/analysis/${encodeURIComponent(pokemonName)}`)
            .then(r => r.json())
            .then(data => {
                if (quill && data.analysis && data.analysis.html) {
                    quill.clipboard.dangerouslyPasteHTML(data.analysis.html);
                } else if (quill && typeof data.analysis === 'string') {
                    quill.clipboard.dangerouslyPasteHTML(data.analysis.replace(/\n/g, '<br>'));
                } else if (quill) {
                    quill.clipboard.dangerouslyPasteHTML('');
                }
                document.getElementById('analysis-password').value = password;
            });
    };
    saveBtn.onclick = function() {
        const author = document.getElementById('analysis-author').value.trim();
        let password = document.getElementById('analysis-password').value;
        if (!password) {
            password = prompt('Enter admin password to save:') || '';
            if (!password) return;
            document.getElementById('analysis-password').value = password;
            localStorage.setItem('analysis_secret', password);
        }
        const html = quill ? quill.root.innerHTML : '';
        fetch(`/api/analysis/${encodeURIComponent(pokemonName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: password, author, html })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                editor.style.display = 'none';
                analysisContent.style.display = '';
                editBtn.style.display = '';
                fetchAnalysis();
            } else {
                alert('Save failed: ' + (data.error || 'Unknown error'));
            }
        });
    };
    cancelBtn.onclick = function() {
        editor.style.display = 'none';
        analysisContent.style.display = '';
        editBtn.style.display = '';
    };

    // Tooltip logic for abilities, moves, items, stat labels, and fangame sprites
    document.addEventListener('mouseover', function (e) {
        if (e.target.classList.contains('hover-ability')) {
            const ability = abilitiesJson[e.target.dataset.id];
            if (!ability) return;
            const html = `<strong>${ability.name}</strong><br>${ability.desc || ability.shortDesc || "No description."}`;
            showTooltip(html, e.pageX, e.pageY);
        }
        if (e.target.classList.contains('hover-move')) {
            const move = movesJson[e.target.dataset.id];
            if (!move) return;
            let flagsHtml = '';
            if (move.flags && typeof move.flags === 'object' && Object.keys(move.flags).length > 0) {
                flagsHtml = `<div style="margin-top:4px;"><strong>Flags:</strong> <span style="font-size:13px;">${Object.keys(move.flags).map(f => capitalize(f)).join(', ')}</span></div>`;
            }
            let priorityHtml = '';
            if (typeof move.priority === 'number' && move.priority !== 0) {
                priorityHtml = `<strong>Priority:</strong> ${move.priority > 0 ? '+' : ''}${move.priority}<br>`;
            }
            const html = `<strong>${move.name}</strong><br><img src="https://play.pokeathlon.com/fx/types/${move.type}.png"> <img src="https://play.pokemonshowdown.com/sprites/categories/${move.category}.png"><br><strong>Power:</strong> ${power} &nbsp; <strong>Accuracy:</strong> ${accuracy} &nbsp; <strong>PP:</strong> ${pp}</div><div style="font-size:13px;margin-top:2px;opacity:0.75;">${desc}</div></div></li>`;
            showTooltip(html, e.pageX, e.pageY);
        }
        if (e.target.classList.contains('hover-item')) {
            const item = itemsJson[e.target.dataset.id];
            if (!item) return;
            const html = `<strong>${item.name}</strong><br><div style="margin-top:4px;">${item.desc || item.shortDesc || "No description."}</div>`;
            showTooltip(html, e.pageX, e.pageY);
        }
        if ((e.target.id === 'pokemon-sprite' || e.target.classList.contains('pokemon-sprite')) && e.target.hasAttribute('data-fangame')) {
            const fangame = e.target.getAttribute('data-fangame');
            if (fangame) showTooltip(`From <strong>${fangame}</strong>`, e.pageX, e.pageY);
        }
        if (e.target.classList.contains('stat-label') && e.target.dataset.tooltip) {
            e.target.removeAttribute('title');
            showTooltip(e.target.dataset.tooltip.replace(/<br>/g, '<br>'), e.pageX, e.pageY);
        }
    });
    document.addEventListener('mouseout', function (e) {
        if (
            e.target.classList.contains('hover-ability') ||
            e.target.classList.contains('hover-move') ||
            e.target.classList.contains('hover-item') ||
            ((e.target.id === 'pokemon-sprite' || e.target.classList.contains('pokemon-sprite')) && e.target.hasAttribute('data-fangame')) ||
            e.target.classList.contains('stat-label')
        ) {
            hideTooltip();
        }
    });

    // Always show the edit button for now
    editBtn.style.display = '';

    // Helper: create a form card (base or special)
    function createFormCard(entry, fangame, isBase) {
        // Prepare types as icons
        let types = '???';
        if (entry.types) {
            types = `<div class="type-icons hover-typing" data-types="${entry.types.join(',')}">` +
                entry.types.map(type => {
                    let iconType = type === '???' ? 'notype' : type;
                    return `<img src="https://play.pokeathlon.com/fx/types/${iconType}.png" alt="${capitalize(type)}" class="type-icon">`;
                }).join('') +
                `</div>`;
        }

        // Prepare abilities as a list
        let abilitiesListHtml = 'No Ability';
        if (entry.abilities) {
            if (Array.isArray(entry.abilities)) {
                abilitiesListHtml = `<ul class="ability-list">${entry.abilities.map(ability => {
                    const abilityName = typeof ability === 'string' ? ability : ability.name;
                    const abilityId = abilityName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return `<li><span class="hover-ability" data-id="${abilityId}">${capitalize(abilityName)}</span></li>`;
                }).join('')}</ul>`;
            } else if (typeof entry.abilities === 'object') {
                const abilityValues = Object.values(entry.abilities);
                abilitiesListHtml = `<ul class="ability-list">${abilityValues.map(ability => {
                    const abilityName = ability;
                    const abilityId = abilityName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return `<li><span class="hover-ability" data-id="${abilityId}">${capitalize(abilityName)}</span></li>`;
                }).join('')}</ul>`;
            }
        }

        // Stats as bars
        const statsList = entry.baseStats
            ? Object.entries(entry.baseStats).map(([stat, value]) => createStatBar(stat, value)).join('')
            : 'Unknown';

        // Required item
        let requiredItemHtml = '';
        if (entry.requiredItem) {
            requiredItemHtml = `<div style="margin-top:4px;"><strong>Required Item:</strong> <span style="text-decoration:underline;cursor:pointer;">${entry.requiredItem}</span></div>`;
        }

        // Card container
        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'left';
        card.style.minWidth = '100%';
        card.style.maxWidth = '320px';
        card.style.background = 'rgba(255,255,255,0.05)';
        card.style.borderRadius = '12px';
        card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        card.style.padding = '16px 12px 12px 12px';
        card.style.marginBottom = '24px';

        // Name above sprite
        const nameElem = document.createElement('h2');
        nameElem.textContent = capitalize(entry.name);
        nameElem.style.margin = '0 0 8px 0';
        nameElem.style.fontSize = '1.3em';
        nameElem.style.textAlign = 'center';
        card.appendChild(nameElem);

        // Sprite row: front/back, shiny/nonshiny
        const spriteRow = document.createElement('div');
        spriteRow.style.display = 'flex';
        spriteRow.style.flexDirection = 'row';
        spriteRow.style.justifyContent = 'left';
        spriteRow.style.alignItems = 'center';
        spriteRow.style.gap = '10px';
        // Normal front
        const spriteFront = document.createElement('img');
        spriteFront.src = getSpriteURL(entry, false, false);
        spriteFront.alt = entry.name + ' front';
        spriteFront.style.width = '96px';
        spriteFront.style.height = '96px';
        spriteFront.className = 'pokemon-sprite';
        if (fangame) spriteFront.setAttribute('data-fangame', fangame);
        spriteRow.appendChild(spriteFront);
        // Normal back
        const spriteBack = document.createElement('img');
        spriteBack.src = getSpriteURL(entry, true, false);
        spriteBack.alt = entry.name + ' back';
        spriteBack.style.width = '96px';
        spriteBack.style.height = '96px';
        spriteBack.className = 'pokemon-sprite';
        if (fangame) spriteBack.setAttribute('data-fangame', fangame);
        spriteRow.appendChild(spriteBack);
        // Shiny front
        const spriteFrontShiny = document.createElement('img');
        spriteFrontShiny.src = getSpriteURL(entry, false, true);
        spriteFrontShiny.alt = entry.name + ' shiny front';
        spriteFrontShiny.style.width = '96px';
        spriteFrontShiny.style.height = '96px';
        spriteFrontShiny.className = 'pokemon-sprite';
        if (fangame) spriteFrontShiny.setAttribute('data-fangame', fangame);
        spriteRow.appendChild(spriteFrontShiny);
        // Shiny back
        const spriteBackShiny = document.createElement('img');
        spriteBackShiny.src = getSpriteURL(entry, true, true);
        spriteBackShiny.alt = entry.name + ' shiny back';
        spriteBackShiny.style.width = '96px';
        spriteBackShiny.style.height = '96px';
        spriteBackShiny.className = 'pokemon-sprite';
        if (fangame) spriteBackShiny.setAttribute('data-fangame', fangame);
        spriteRow.appendChild(spriteBackShiny);
        card.appendChild(spriteRow);

        // Required item (with tooltip)
        if (requiredItemHtml) {
            const reqDiv = document.createElement('div');
            reqDiv.innerHTML = requiredItemHtml;
            card.appendChild(reqDiv);
        }

        // Info columns
        const infoFlexHtml = `
        <div class="analysis-flex" style="margin-top:12px;">
            <div class="analysis-left">
                <div><strong>Typing:</strong> ${types}</div>
                <div><strong>Abilities:</strong> ${abilitiesListHtml}</div>
            </div>
            <div class="analysis-right">
                ${statsList}
            </div>
        </div>
        `;
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = infoFlexHtml;
        card.appendChild(infoDiv);

        return card;
    }

    // Helper: create a stat bar (with advanced tooltip stat calculation)
    function createStatBar(stat, value) {
        const STAT_DISPLAY_NAMES = {
            hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk.', spd: 'Sp. Def.', spe: 'Speed',
        };
        const barColor = getStatColor(value);
        const barWidth = (value / 255) * 100;
        const statLabel = STAT_DISPLAY_NAMES[stat] || capitalize(stat);
        // Advanced tooltip for actual stat calcs
        function calcStat(stat, base, iv, ev, nature) {
            if (stat === 'hp') {
                if (base === 1) return 1;
                return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * 100) / 100) + 100 + 10;
            } else {
                let n = 1.0;
                if (nature === 'plus') n = 1.1;
                if (nature === 'minus') n = 0.9;
                return Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * 100) / 100) + 5) * n);
            }
        }
        let tooltip = '';
        if (["hp", "atk", "def", "spa", "spd", "spe"].includes(stat)) {
            const base = value;
            if (stat === "hp") {
                const min = calcStat("hp", base, 0, 0, "neutral");
                const neutral = calcStat("hp", base, 31, 0, "neutral");
                const max = calcStat("hp", base, 31, 252, "neutral");
                tooltip = `Min (0 IV/EV): ${min}<br>Neutral (31 IV, 0 EV): ${neutral}<br>Max (31 IV, 252 EV): ${max}`;
            } else {
                const min = calcStat(stat, base, 0, 0, "minus");
                const neutral = calcStat(stat, base, 31, 0, "neutral");
                const maxNeutral = calcStat(stat, base, 31, 252, "neutral");
                const maxPlus = calcStat(stat, base, 31, 252, "plus");
                // -1, +1, +2 boosts
                const maxNeutralM1 = Math.floor(maxNeutral * 2 / 3);
                const maxPlusM1 = Math.floor(maxPlus * 2 / 3);
                const maxNeutral1 = Math.floor(maxNeutral * 1.5);
                const maxPlus1 = Math.floor(maxPlus * 1.5);
                const maxNeutral2 = maxNeutral * 2;
                const maxPlus2 = maxPlus * 2;
                tooltip = `Min (0 IV/EV, -Nature): ${min}<br>` +
                    `Neutral (31 IV, 0 EV): ${neutral}<br>` +
                    `Max (31 IV, 252 EV, Neutral): ${maxNeutral}<br>` +
                    `Max (31 IV, 252 EV, +Nature): ${maxPlus}<br>` +
                    `Max Neutral -1: ${maxNeutralM1}<br>` +
                    `Max +Nature -1: ${maxPlusM1}<br>` +
                    `Max Neutral +1: ${maxNeutral1}<br>` +
                    `Max +Nature +1: ${maxPlus1}<br>` +
                    `Max Neutral +2: ${maxNeutral2}<br>` +
                    `Max +Nature +2: ${maxPlus2}`;
            }
        }
        return `
            <div class="stat-row" style="display:flex;align-items:center;margin-bottom:8px;">
                <span class="stat-label" data-stat="${stat}" style="display:inline-block;width:90px;min-width:90px;max-width:90px;text-align:left;cursor:pointer;" data-tooltip="${tooltip.replace(/"/g, '&quot;')}">${statLabel}</span>
                <span style="display:inline-block;width:40px;text-align:right;margin-right:10px;">${value}</span>
                <span class="stat-bar-container" style="width:300px;height:12px;display:inline-block;vertical-align:middle;border-radius:6px;overflow:hidden;">
                    <span class="stat-bar-fill" style="display:inline-block;height:100%;width:${barWidth}%;background:${barColor};border-radius:6px;"></span>
                </span>
            </div>
        `;
    }
});
