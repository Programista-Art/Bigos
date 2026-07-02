  const pogodynkaApp = {
            search: async () => {
                const city = document.getElementById('pogodynka-city').value; if(!city) return;
                document.getElementById('pog-city').innerText = 'Szukam...';
                try {
                    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pl`); const geoData = await geoRes.json();
                    if(!geoData.results || geoData.results.length === 0) { document.getElementById('pog-city').innerText = 'Nie znaleziono miasta.'; return; }
                    const lat = geoData.results[0].latitude; const lon = geoData.results[0].longitude; const cityName = geoData.results[0].name;
                    const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`); const wxData = await wxRes.json();
                    const cw = wxData.current_weather;
                    document.getElementById('pog-city').innerText = cityName; document.getElementById('pog-temp').innerText = `${Math.round(cw.temperature)}°C`; document.getElementById('pog-wind').innerText = `${cw.windspeed} km/h`;
                    const code = cw.weathercode; let icon = '🌤️'; let desc = 'Pochmurnie';
                    if(code === 0) { icon = '☀️'; desc = 'Słonecznie'; } else if(code === 1 || code === 2 || code === 3) { icon = '⛅'; desc = 'Częściowe zachm.'; } else if(code === 45 || code === 48) { icon = '🌫️'; desc = 'Mgła'; } else if(code >= 51 && code <= 67) { icon = '🌧️'; desc = 'Deszczowo'; } else if(code >= 71 && code <= 77) { icon = '🌨️'; desc = 'Śnieg'; } else if(code >= 80 && code <= 82) { icon = '☔'; desc = 'Ulewa'; } else if(code >= 95) { icon = '⛈️'; desc = 'Burza'; }
                    document.getElementById('pog-icon').innerText = icon; document.getElementById('pog-desc').innerText = desc;
                } catch(e) { document.getElementById('pog-city').innerText = 'Błąd połączenia.'; }
            }
        };