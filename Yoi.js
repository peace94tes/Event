 
      // Decryption function for hosted environment (JavaScript)
function decryptUrl(url) {
  // Cek apakah URL memiliki penanda _token=989324ehhedfkhjswf32423kjhksdfgsdge425t34t4e
  if (!url.endsWith('_token=989324ehhedfkhjswf32423kjhksdfgsdge425t34t4e')) {
    return url; // Lewati URL yang tidak memiliki penanda
  }

  // Hapus penanda dari URL
  url = url.replace('_token=989324ehhedfkhjswf32423kjhksdfgsdge425t34t4e', '');

  // Pisahkan protokol
  var protocol = extractProtocol(url);
  
  // Pisahkan domain, path, dan ekstensi
  var { domainAndPath, excludedExtensions, extensionPositions } = extractDomainAndPathAndExtensionPositions(url);

  // Dekripsi domain dan path tanpa protokol dan ekstensi menggunakan tabel substitusi acak
  var decryptedDomainAndPath = substituteDecrypt(domainAndPath);

  // Gabungkan kembali URL dengan ekstensi di posisi aslinya
  var newUrl = insertExtensionsBack(decryptedDomainAndPath, excludedExtensions, extensionPositions);

  // Gabungkan kembali dengan protokol
  newUrl = protocol + newUrl;

  return newUrl;
}

// Fungsi untuk mengekstrak protokol (https:// atau http://)
function extractProtocol(url) {
  var match = url.match(/https?:\/\//);
  return match ? match[0] : '';
}

// Fungsi untuk mengekstrak domain, path, dan ekstensi, serta posisi ekstensi
function extractDomainAndPathAndExtensionPositions(url) {
  // Pisahkan protokol dari sisa URL
  var protocolRegex = /^https?:\/\//i;
  var domainAndPath = url.replace(protocolRegex, '');

  // Cari ekstensi yang dikenal dan keluarkan mereka dari dekripsi
  var extensionsPattern = /(\.html|\.php|\.m3u8|\.css|\.js|\.xml|\.json)/gi;
  var excludedExtensions = [];
  var extensionPositions = [];
  
  var match;
  while ((match = extensionsPattern.exec(domainAndPath)) !== null) {
    excludedExtensions.push(match[0]); // Simpan ekstensi
    extensionPositions.push(match.index); // Simpan posisi ekstensi
    domainAndPath = domainAndPath.replace(match[0], ''); // Hapus ekstensi dari domainAndPath untuk didekripsi
  }

  return { domainAndPath, excludedExtensions, extensionPositions };
}

// Fungsi untuk memasukkan ekstensi kembali ke posisi asli mereka
function insertExtensionsBack(decryptedDomainAndPath, excludedExtensions, extensionPositions) {
  var result = decryptedDomainAndPath;
  for (var i = 0; i < excludedExtensions.length; i++) {
    var position = extensionPositions[i];
    var extension = excludedExtensions[i];
    result = result.slice(0, position) + extension + result.slice(position);
  }
  return result;
}

// Fungsi untuk mendekripsi menggunakan tabel substitusi acak
function substituteDecrypt(text) {
  var substitutionTable = {
    'a':'z','b':'y','c':'x','d':'w','e':'v','f':'u','g':'t','h':'s','i':'r','j':'q','k':'p','l':'o','m':'n','n':'m','o':'l','p':'k','q':'j','r':'i','s':'h','t':'g','u':'f','v':'e','w':'d','x':'c','y':'b','z':'a','0':'9','1':'8','2':'7','3':'6','4':'5','5':'4','6':'3','7':'2','8':'1','9':'0'
  };

  var result = '';
  for (var i = 0; i < text.length; i++) {
    var char = text[i];
    result += substitutionTable[char] || char; // Jika tidak ada dalam tabel, biarkan karakter tidak berubah
  }
  return result;
}
  
    var intervals = {}; // Object to keep track of intervals
    var activeEventId = null; // Track the currently active event
    const fallbackURL = "https://ratix94.blogspot.com/p/streamnotfound.html"; // URL fallback jika URL tidak ditemukan

function isMobileDevice() {
    return /Mobi|Android/i.test(navigator.userAgent);
}

function setupEvents() {
    var eventContainers = document.querySelectorAll('.event-container');
    var validEventIds = [];

    eventContainers.forEach(function(container) {
        var id = container.getAttribute('data-id');
        validEventIds.push(id);

        // Event time (match-date and match-time)
        var matchDate = container.querySelector('.match-date').textContent.trim();
        var matchTime = container.querySelector('.match-time').textContent.trim();
        var eventTime = parseEventDateTime(matchDate, matchTime);

        // <div class="center"><div class="match-date">2024-12-24</div>off event time (kickoff-match-date and kickoff-match-time)
        var kickoffDate = container.querySelector('.kickoff-match-date').textContent.trim();
        var kickoffTime = container.querySelector('.kickoff-match-time').textContent.trim();
        var kickoffEventTime = parseEventDateTime(kickoffDate, kickoffTime);

        var eventDurationHours = parseFloat(container.getAttribute('data-duration')) || 3.5;
        var eventDurationMilliseconds = eventDurationHours * 60 * 60 * 1000;

        // Update match times for both eventTime and kickoffEventTime
        updateMatchTimes(container, eventTime); // Original event time
        updateMatchTimes(container, kickoffEventTime); // Kickoff time adjustment

        // Check live status using eventTime
        checkLiveStatus(container, eventTime, eventDurationMilliseconds);

        // Check stored event status
        var storedStatus = sessionStorage.getItem(`eventStatus_${id}`);
        if (storedStatus === 'ended') {
            markEventAsEnded(id); // Set event as ended if stored status is "ended"
            if (activeEventId === id) {
                redirectToEndedURL();
            }
        }

        // Setup server buttons
        var servers = JSON.parse(container.getAttribute('data-servers'));
        var buttonsContainer = container.querySelector('.buttons-container');

        buttonsContainer.innerHTML = ''; // Clear existing buttons

        servers.forEach(function(server, index) {
            if (server.label.includes("Mobile") && !isMobileDevice()) {
                return;
            }

            var button = document.createElement('div');
            button.className = 'server-button';
            button.textContent = server.label;
            button.setAttribute('data-url', server.url);
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                selectServerButton(button);
                loadEventVideo(container, server.url);
            });
            buttonsContainer.appendChild(button);

            if (index === 0) {
                button.classList.add('active');
            }
        });

        // Add event listener to toggle server buttons on click
        container.addEventListener('click', function() {
            var now = new Date();
            if (now >= eventTime) {
                toggleServerButtons(container, true);
            }
            loadEventVideo(container); // Ensure the event is loaded when container is clicked
        });

        // Restore active button state from sessionStorage
        var storedActiveEventId = sessionStorage.getItem('activeEventId');
        var storedActiveServerUrl = sessionStorage.getItem(`activeServerUrl_${id}`);
        if (storedActiveEventId === id && storedActiveServerUrl) {
            var storedButton = container.querySelector(`.server-button[data-url="${storedActiveServerUrl}"]`);
            if (storedButton) {
                selectServerButton(storedButton);
                loadEventVideo(container, storedActiveServerUrl, false);
            }
        }
    });

    // Check if the active event is still valid, otherwise reset it
    if (activeEventId && !validEventIds.includes(activeEventId)) {
        redirectToEndedURL();
    }

    // Start periodic check for event statuses
    startPeriodicEventCheck();
}

    function parseEventDateTime(date, time) {
        // Assuming date format is "June 21, 2024" and time is "07:30"
        var formattedDate = new Date(`${date}T${time}:00+07:00`);
        return formattedDate;
    }

    function updateCountdown(countdownElement, countdownTimer, eventTime, url, id) {
        clearInterval(intervals[id]); // Clear previous interval if exists

        var interval = setInterval(function() {
            var now = new Date().getTime();
            var distance = eventTime.getTime() - now;

            if (distance < 1000) { // Clear the video src just before the countdown ends
                var videoIframe = document.getElementById('video-iframe');
                if (videoIframe) {
                    videoIframe.src = '';
                }
            }

            if (distance < 0) {
                clearInterval(interval);
                countdownElement.style.display = 'none';
                console.log('Event started:', id);
                loadEventVideo(document.querySelector(`.event-container[data-id="${id}"]`), url, false); // Load video with the initial URL
                checkLiveStatus(document.querySelector(`.event-container[data-id="${id}"]`), eventTime); // Show live label

                // Mark the first button as active
                var firstButton = document.querySelector(`.event-container[data-id="${id}"] .server-button`);
                if (firstButton) {
                    selectServerButton(firstButton);
                }

                // Set timeout to check if event should end after its duration
                var eventDurationMilliseconds = parseFloat(document.querySelector(`.event-container[data-id="${id}"]`).getAttribute('data-duration')) * 60 * 60 * 1000 || 3.5 * 60 * 60 * 1000;
                var eventEndTime = new Date(eventTime.getTime() + eventDurationMilliseconds);
                setTimeout(function() {
                    var now = new Date();
                    if (now >= eventEndTime) {
                        if (activeEventId === id) {
                            markEventAsEnded(id);
                            redirectToEndedURL();
                        }
                    }
                }, eventDurationMilliseconds);
            } else {
                var days = Math.floor(distance / (1000 * 60 * 60 * 24));
                var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                var seconds = Math.floor((distance % (1000 * 60)) / 1000);

                countdownElement.style.display = 'block'; // Ensure countdown element is displayed
                countdownTimer.innerHTML = `${days}h ${hours}j ${minutes}m ${seconds}d`;
                console.log(`Countdown for event ${id}: ${days}h ${hours}j ${minutes}m ${seconds}d`);
            }
        }, 1000);

        intervals[id] = interval; // Store the interval in the intervals object
    }

function updateMatchTimes(container, eventStartTime) {
    var matchDateElem = container.querySelector('.match-date');
    var matchTimeElem = container.querySelector('.match-time');
    var kickoffDateElem = container.querySelector('.kickoff-match-date');
    var kickoffTimeElem = container.querySelector('.kickoff-match-time');

    if (!matchDateElem.hasAttribute('data-original-date')) {
        matchDateElem.setAttribute('data-original-date', matchDateElem.textContent.trim());
        matchTimeElem.setAttribute('data-original-time', matchTimeElem.textContent.trim());
    }

    var utcDate = new Date(eventStartTime.getTime() + (eventStartTime.getTimezoneOffset() * 60000));
    var visitorOffsetInMinutes = new Date().getTimezoneOffset();
    var visitorOffsetInHours = visitorOffsetInMinutes / 60;
    var localEventStartTime = new Date(utcDate.getTime() - (visitorOffsetInHours * 60 * 60 * 1000));

    var adjustedDate = localEventStartTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var adjustedTime = localEventStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    console.log(`Adjusted date for event: ${adjustedDate}`);
    console.log(`Adjusted time for event: ${adjustedTime}`);

    // Update match date and time
    matchDateElem.textContent = adjustedDate;
    matchTimeElem.textContent = adjustedTime;

    // Update kickoff date and time if available
    if (kickoffDateElem && kickoffTimeElem) {
        kickoffDateElem.textContent = adjustedDate;
        kickoffTimeElem.textContent = adjustedTime;
    }
}
    function checkLiveStatus(container, eventStartTime, eventDurationMilliseconds) {
        var now = new Date();
        var liveLabel = container.querySelector('.live-label');

        if (now >= eventStartTime) {
            liveLabel.style.display = 'block';
            console.log('Event live:', container.getAttribute('data-id'));

            // Set timeout untuk menyembunyikan event container saat event berakhir
            var eventEndTime = new Date(eventStartTime.getTime() + eventDurationMilliseconds);
            setTimeout(function() {
                var now = new Date();
                if (now >= eventEndTime) {
                    markEventAsEnded(container.getAttribute('data-id')); // Sembunyikan event-container saat event berakhir
                }
            }, eventEndTime.getTime() - now);
        } else {
            liveLabel.style.display = 'none';
            console.log('Event not live yet:', container.getAttribute('data-id'));

            // Set timeout untuk mengecek status live lagi saat event dimulai
            setTimeout(function() {
                checkLiveStatus(container, eventStartTime, eventDurationMilliseconds);
            }, eventStartTime.getTime() - now);
        }
    }

    function setupChannels() {
        var channelContainers = document.querySelectorAll('.channel-container');

        // Ambil ID elemen yang sebelumnya dipilih dari sessionStorage
        var activeChannelId = sessionStorage.getItem('activeChannelId');

        channelContainers.forEach(function(container) {
            var channelId = container.getAttribute('data-id'); // Pastikan elemen punya atribut unik, misalnya "data-id"

            // Jika elemen ini adalah yang terakhir dipilih, tambahkan kelas .selected
            if (channelId === activeChannelId) {
                container.classList.add('selected');
                // Gunakan loadEventVideo untuk memuat ulang video dari channel-container
                loadEventVideo(container); // Muat ulang video dengan fungsi loadEventVideo
            }

            // Tambahkan event listener untuk klik
            container.addEventListener('click', function() {
                // Hapus kelas .selected dari semua elemen lain
                channelContainers.forEach(function(otherContainer) {
                    otherContainer.classList.remove('selected');
                });

                // Tambahkan kelas .selected ke elemen yang diklik
                container.classList.add('selected');

                // Simpan ID elemen yang sedang dipilih ke sessionStorage
                sessionStorage.setItem('activeChannelId', channelId);

                // Load video menggunakan loadEventVideo
                loadEventVideo(container); // Panggil loadEventVideo untuk memuat video channel
            });
        });
    }

    // Variabel global untuk Clappr Player instance, timeout reconnect, dan cache URL
    var clapprPlayerInstance = null;
    var reconnectTimeout = null;
    var lastLoadedUrl = null;  // Cache URL terakhir yang dimuat

    function normalizeUrl(url) {
        try {
            let urlObj = new URL(url);
            // Hapus trailing slash, tetapi tetap simpan query string jika ada
            let normalizedUrl = urlObj.origin + urlObj.pathname + urlObj.search;
            return normalizedUrl;
        } catch (e) {
            console.error("Invalid URL:", url);
            return url; // Kembalikan URL asli jika tidak bisa diparsing
        }
    }

    function loadEventVideo(container, specificUrl = null, resetActiveId = true) {
        var id = container.getAttribute('data-id'); // Mendapatkan data-id
        var storedUrl = sessionStorage.getItem(`activeServerUrl_${id}`); // Ambil URL dari sessionStorage tanpa mendekripsi
        var url = specificUrl || storedUrl || container.getAttribute('data-url') || fallbackURL;
        var isChannel = container.classList.contains('channel-container'); // Deteksi apakah ini channel-container

        var matchDate = container.querySelector('.match-date')?.getAttribute('data-original-date');
        var matchTime = container.querySelector('.match-time')?.getAttribute('data-original-time');
        var eventDurationHours = parseFloat(container.getAttribute('data-duration')) || 3.5;
        var eventDurationMilliseconds = eventDurationHours * 60 * 60 * 1000;

        var eventStartTime = parseEventDateTime(matchDate, matchTime);
        var now = new Date();

        if (isNaN(eventStartTime.getTime()) && !isChannel) {
            console.error(`Invalid event time for event ${id}: ${matchDate} ${matchTime}`);
            return;
        }

        if (resetActiveId) {
            activeEventId = id; // Set the active event ID
            sessionStorage.setItem('activeEventId', id); // Save active event ID to session storage
        }

        var countdownElement = document.getElementById('countdown');
        var countdownTimer = countdownElement.querySelector('.countdown-timer');
        var videoIframe = document.getElementById('video-iframe');
        var videoPlaceholder = document.getElementById('video-placeholder');
        var playerElement = document.getElementById("player");

        // Set sandbox attributes before loading the URL
        var decryptedUrl = decryptUrl(url); // Dekripsi hanya pada variabel baru sebelum digunakan
        if (decryptedUrl.includes('sportslive2-4') || decryptedUrl.includes('sportcastelite') || decryptedUrl.includes('engageboost') || decryptedUrl.includes('quietlywheat23') || decryptedUrl.includes('usgate') || decryptedUrl.includes('sportsonline') || decryptedUrl.includes('zeeplayer') || decryptedUrl.includes('sportsnews') || decryptedUrl.includes('bestsolaris') || decryptedUrl.includes('streambtw') || decryptedUrl.includes('streamtp') || decryptedUrl.includes('popcdn') || decryptedUrl.includes('bong') || decryptedUrl.includes('plcdn') || decryptedUrl.includes('decmelfot') || decryptedUrl.includes('weakspell') || decryptedUrl.includes('1stream') || decryptedUrl.includes('venoms') || decryptedUrl.includes('p2plive2')) {
            videoIframe.setAttribute('sandbox', 'allow-orientation-lock allow-transparency allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-top-navigation');
        } else {
        videoIframe.removeAttribute('sandbox');
    }

        // Hide all countdowns and clear all intervals
        document.querySelectorAll('.countdown-wrapper').forEach(function(countdown) {
            countdown.style.display = 'none';
        });
        for (var key in intervals) {
            clearInterval(intervals[key]);
        }

        // Hide buttons for other events
        document.querySelectorAll('.event-container .server-buttons').forEach(function(buttonsContainer) {
            buttonsContainer.style.display = 'none';
        });

        // Jika ini channel-container (menggunakan iframe langsung)
        if (isChannel) {
            // Hentikan dan kosongkan Clappr Player jika masih aktif
            if (clapprPlayerInstance) {
                clapprPlayerInstance.destroy(); // Hancurkan Clappr Player
                clapprPlayerInstance = null; // Reset Clappr instance setelah dihancurkan
                lastLoadedUrl = null; // Reset URL terakhir yang dimuat
            }

            // Set URL iframe jika berbeda
            if (videoIframe.src !== decryptedUrl) {
                videoIframe.src = decryptedUrl; // Set URL iframe
            }
            videoIframe.style.display = 'block'; // Tampilkan iframe
            videoPlaceholder.style.display = 'none'; // Sembunyikan placeholder
            playerElement.style.display = 'none'; // Sembunyikan Clappr Player
            console.log('Channel video loaded:', decryptedUrl);
            return; // Tidak melanjutkan logika event-container
        }

        // Jika URL adalah m3u8, gunakan Clappr Player
        if (now >= eventStartTime) {
            countdownElement.style.display = 'none';

            // Hentikan dan kosongkan iframe jika berpindah dari URL iframe ke URL lain
            if (videoIframe && videoIframe.src !== decryptedUrl) {
                videoIframe.src = ''; // Kosongkan src iframe untuk menghentikan pemutaran video
                videoIframe.style.display = 'none'; // Sembunyikan iframe
            }

            if (decryptedUrl.includes(".m3u8")) {
                let normalizedUrl = normalizeUrl(decryptedUrl);

                // Jika Clappr player sudah ada dan tidak perlu diinisialisasi ulang
                if (clapprPlayerInstance && lastLoadedUrl === normalizedUrl) {
                    console.log('Clappr sudah ada, sembunyikan video-placeholder dan tampilkan player');
                    videoPlaceholder.style.display = 'none'; // Sembunyikan placeholder
                    playerElement.style.display = 'block'; // Pastikan player tetap tampil
                } else {
                    // Jika Clappr player sudah ada, tetapi URL berbeda, maka kita hancurkan dan inisialisasi ulang
                    if (clapprPlayerInstance) {
                        // Bersihkan event listeners dan pending reconnects
                        clapprPlayerInstance.off(Clappr.Events.PLAYER_ERROR);
                        clapprPlayerInstance.off(Clappr.Events.PLAYER_STOP);
                        clearTimeout(reconnectTimeout);
                        clapprPlayerInstance.destroy(); // Hancurkan player jika URL berbeda
                        clapprPlayerInstance = null; // Reset instance setelah dihancurkan
                    }

                    videoPlaceholder.style.display = 'none'; // Sembunyikan placeholder
                    playerElement.style.display = 'block'; // Tampilkan Clappr Player

                    // Inisialisasi Clappr Player
                    clapprPlayerInstance = new Clappr.Player({
                        source: normalizedUrl,
                        height: '100%',
                        width: '100%',
                        loop: 'true',
                        poster: 'https://cdn.jsdelivr.net/gh/peace94tes/LogoSports@refs/heads/main/PeaceTV_Logo_Player.jpg',
                        watermark: 'https://cdn.jsdelivr.net/gh/peace94tes/peacetv@main/Peace_Logo_1.png',
                        position: 'top-right',
                      //  watermarkLink: '#',
                        plugins: [LevelSelector],
                        mediacontrol: {
                            seekbar: 'rgb(32,178,170)',
                            buttons: '#FFF'
                        },
                        playback: {
                            hlsjsConfig: {
                                startPosition: -1, // Selalu mulai dari posisi live terkini
                            }
                        },
                        mimeType: "application/x-mpegURL"
                    });

                    clapprPlayerInstance.attachTo(playerElement); // Attach Clappr ke playerElement
                    lastLoadedUrl = normalizedUrl; // Simpan URL terakhir yang dimuat

                    // Force landscape on fullscreen
                    clapprPlayerInstance.on(Clappr.Events.PLAYER_FULLSCREEN, function() {
                        if (screen.orientation && screen.orientation.lock) {
                            screen.orientation.lock('landscape').catch(function(error) {
                                console.error('Failed to lock screen orientation:', error);
                            });
                        }
                    });

                    // Unlock orientation on exit fullscreen
                    clapprPlayerInstance.on(Clappr.Events.PLAYER_EXIT_FULLSCREEN, function() {
                        if (screen.orientation && screen.orientation.unlock) {
                            screen.orientation.unlock();
                        }
                    });

                    // Auto-reconnect on error
                    clapprPlayerInstance.on(Clappr.Events.PLAYER_ERROR, function() {
                        console.log('Error occurred, attempting to reconnect...');
                        clearTimeout(reconnectTimeout); // Clear any pending reconnects
                        reconnectTimeout = setTimeout(function() {
                            if (clapprPlayerInstance && clapprPlayerInstance.options.source === normalizedUrl) {
                                clapprPlayerInstance.load({source: normalizedUrl});
                                clapprPlayerInstance.play();
                            }
                        }, 5000); // Coba lagi dalam 5 detik
                    });

                    // Auto-play after stop
                    clapprPlayerInstance.on(Clappr.Events.PLAYER_STOP, function() {
                        if (!clapprPlayerInstance.isPaused()) {
                            console.log('Stream stopped, trying to reconnect');
                            clapprPlayerInstance.play(); // Auto-reconnect jika stream berhenti
                        }
                    });

                    // Auto resize player
                    function resizePlayer() {
                        requestAnimationFrame(() => {
                            var newWidth = playerElement.parentElement.offsetWidth;
                            var newHeight = playerElement.parentElement.offsetHeight;
                            clapprPlayerInstance.resize({ width: newWidth, height: newHeight });
                        });
                    }
                    resizePlayer();
                    window.onresize = resizePlayer;
                }

            } else {
                // Untuk URL lain (bukan m3u8), gunakan iframe biasa
                playerElement.style.display = 'none'; // Sembunyikan Clappr Player
                if (clapprPlayerInstance) {
                    clapprPlayerInstance.destroy(); // Hancurkan Clappr Player jika masih ada
                    clapprPlayerInstance = null; // Reset instance setelah dihancurkan
                    lastLoadedUrl = null; // Reset URL yang terakhir dimuat
                }
                if (videoIframe.src !== decryptedUrl) { // Hanya update src jika berbeda
                    videoIframe.src = decryptedUrl; // Load URL untuk iframe
                }
                videoIframe.style.display = 'block'; // Tampilkan iframe
                videoPlaceholder.style.display = 'none'; // Sembunyikan placeholder
            }

            setActiveHoverEffect(id);  // Fungsi untuk mengatur efek hover berdasarkan id
            console.log('Loading event video now:', id);
            toggleServerButtons(container, true); // Tampilkan tombol server
            checkLiveStatus(container, eventStartTime, eventDurationMilliseconds); // Show live label

            // Mark the correct button as active if not already marked
            var activeButton = container.querySelector(`.server-button[data-url="${url}"]`);
            if (activeButton) {
                selectServerButton(activeButton);
            }
        } else {
            // Jika event belum dimulai, tampilkan video-placeholder tanpa menghancurkan Clappr player
            countdownElement.style.display = 'block';
            videoIframe.style.display = 'none';
            videoPlaceholder.style.display = 'block'; // Pastikan placeholder tampil di atas Clappr
            playerElement.style.display = 'none'; // Sembunyikan Clappr player sementara waktu
            updateCountdown(countdownElement, countdownTimer, eventStartTime, url, id);
            setActiveHoverEffect(id); // Set hover effect when event is selected
            console.log('Setting countdown for future event:', id);
        }

        // Tampilkan tombol server untuk event yang aktif
        toggleServerButtons(container, now >= eventStartTime);

        // Simpan URL server yang aktif di sessionStorage
        if (resetActiveId && specificUrl) {
            sessionStorage.setItem(`activeServerUrl_${id}`, specificUrl);
        }
    }

    function markEventAsEnded(eventId) {
        var eventContainer = document.querySelector(`.event-container[data-id="${eventId}"]`);
        if (eventContainer) {
            sessionStorage.setItem(`eventStatus_${eventId}`, 'ended'); // Simpan status "Ended" di sessionStorage
            eventContainer.style.display = 'none'; // Sembunyikan event container ketika event berakhir
        }
    }

    function redirectToEndedURL() {
        var storedActiveEventId = sessionStorage.getItem('activeEventId');
        var storedStatus = sessionStorage.getItem(`eventStatus_${storedActiveEventId}`);

        if (storedStatus === 'ended') {
            // Jika event sudah berakhir, sembunyikan event-container aktif
            var activeEventContainer = document.querySelector(`.event-container[data-id="${storedActiveEventId}"]`);
            if (activeEventContainer) {
                activeEventContainer.style.display = 'none'; // Sembunyikan event container
            }
        }
    }

    function setActiveHoverEffect(activeId) {
        // Menghapus class hover-effect dari semua containers
        document.querySelectorAll('.event-container').forEach(function(container) {
            container.classList.remove('hover-effect');
        });

        // Menambahkan class hover-effect hanya pada container dengan id yang aktif
        var activeContainer = document.querySelector('.event-container[data-id="' + activeId + '"]');
        if (activeContainer) {
            activeContainer.classList.add('hover-effect');
            console.log('Hover effect set for event:', activeId);
        }
    }

    function resetHoverEffect() {
        if (activeEventId) {
            var activeContainer = document.querySelector('.event-container[data-id="' + activeEventId + '"]');
            if (activeContainer) {
                activeContainer.classList.add('hover-effect');
                console.log('Hover effect reset for active event:', activeEventId);
            }
        }
    }

    function toggleServerButtons(container, show = true) {
        var serverButtonsContainer = container.querySelector('.server-buttons');
        if (show) {
            serverButtonsContainer.style.display = 'flex';
        } else {
            serverButtonsContainer.style.display = 'none';
        }
    }




    function selectServerButton(button) {
        // Menghapus class active dari semua tombol server
        var buttons = document.querySelectorAll('.server-button');
        buttons.forEach(function(btn) {
            btn.classList.remove('active');
        });
        // Menambahkan class active pada tombol yang diklik
        button.classList.add('active');
        // Simpan URL dari tombol server yang aktif
        var url = button.getAttribute('data-url');
        var eventId = button.closest('.event-container').getAttribute('data-id');
        sessionStorage.setItem(`activeServerUrl_${eventId}`, url);
    }

    // Fungsi untuk switch content
    function switchContent(target) {
        document.querySelectorAll('.sidebar-content').forEach(function(content) {
            content.classList.remove('active'); // hide all content
        });
        var targetContent = document.getElementById(target);
        targetContent.classList.add('active'); // show target content

        // Lazy load chat iframe
        if (target === 'chat') {
            var chatIframe = targetContent.querySelector('.chat-iframe');
            if (chatIframe && !chatIframe.src) {
                chatIframe.src = chatIframe.getAttribute('data-src');
            }
        }
    }

    function refreshVideoPlayer() {
        var videoIframe = document.getElementById('video-iframe');
        if (videoIframe) {
            var currentSrc = videoIframe.src;

            // Cek apakah iframe tersebut menggunakan Clappr dengan pengecekan sumber video HLS
            if (currentSrc.includes('m3u8') || currentSrc.includes('clappr')) {
                try {
                    // Akses player Clappr di dalam iframe
                    var player = videoIframe.contentWindow.player;

                    if (player) {
                        // Reload Clappr player tanpa mengosongkan src iframe
                        player.stop();
                        player.load({source: player.options.source});  // Memuat ulang stream yang sama
                        player.play();  // Mulai ulang player
                        console.log('Clappr player refreshed successfully');
                    }
                } catch (error) {
                    console.error('Failed to refresh Clappr player:', error);
                }
            } else {
                // Logika untuk iframe selain Clappr (tetap seperti sebelumnya)
                videoIframe.src = '';  // Kosongkan src
                // Set atribut sandbox jika perlu
                if (currentSrc.includes('sportsonline') || currentSrc.includes('sportcastelite') || currentSrc.includes('venoms') || currentSrc.includes('p2plive2')) {
                    videoIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-top-navigation');
                } else {
                    videoIframe.removeAttribute('sandbox');
                }
                videoIframe.src = currentSrc;  // Set ulang src untuk reload iframe
                console.log('Non-Clappr iframe refreshed successfully');
            }
        }
    }

    function startPeriodicEventCheck() {
        setInterval(function() {
            var now = new Date();
            document.querySelectorAll('.event-container').forEach(function(container) {
                var matchDate = container.querySelector('.match-date').getAttribute('data-original-date');
                var matchTime = container.querySelector('.match-time').getAttribute('data-original-time');
                var eventDurationHours = parseFloat(container.getAttribute('data-duration')) || 3.5;
                var eventDurationMilliseconds = eventDurationHours * 60 * 60 * 1000;

                var eventStartTime = parseEventDateTime(matchDate, matchTime);
                var eventEndTime = new Date(eventStartTime.getTime() + eventDurationMilliseconds);

                if (now >= eventEndTime) {
                    var id = container.getAttribute('data-id');
                    markEventAsEnded(id); // Sembunyikan event-container jika event berakhir
                }
            });
        }, 60000); // Periksa setiap menit
    }

    // Setup initial events based on data directly from HTML
    setupEvents();
    setupChannels();
  
    document.addEventListener('DOMContentLoaded', function() {
        var serverButtons = document.querySelectorAll('.server-button');

        serverButtons.forEach(function(button) {
            button.addEventListener('click', function(event) {
                loadAdsterraPopunder();
                event.stopPropagation(); // Menghentikan event agar tidak membubble ke elemen lain
            });
        });
    });

    function loadAdsterraPopunder() {
        var adAlreadyLoaded = document.getElementById('adsterra-script');
        if (!adAlreadyLoaded) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = '//pl25951416.effectiveratecpm.com/2e/b7/c6/2eb7c65ad47eb7c9b27e30ecd7d1a390.js';
            script.id = 'adsterra-script';
            document.body.appendChild(script);
        }
    }

    // Ensure correct video is loaded when returning from popunder
    window.addEventListener('focus', function() {
        var storedActiveEventId = sessionStorage.getItem('activeEventId');
        var storedActiveServerUrl = sessionStorage.getItem(`activeServerUrl_${storedActiveEventId}`);

        if (storedActiveEventId && storedActiveServerUrl) {
            // Dekripsi URL sebelum digunakan
            var decryptedServerUrl = decryptUrl(storedActiveServerUrl);

            var activeContainer = document.querySelector(`.event-container[data-id="${storedActiveEventId}"]`);
            if (activeContainer) {
                var storedButton = activeContainer.querySelector(`.server-button[data-url="${decryptedServerUrl}"]`);
                if (storedButton) {
                    selectServerButton(storedButton);
                    loadEventVideo(activeContainer, decryptedServerUrl, false);
                }
            }
        }
    });


function _0x5b13(_0x925745,_0x5c7bde){const _0x1c2e12=_0x10ad();return _0x5b13=function(_0x566080,_0x249e16){_0x566080=_0x566080-(-0x200c+-0x5*-0x629+0x2fe);let _0x1ba1c3=_0x1c2e12[_0x566080];return _0x1ba1c3;},_0x5b13(_0x925745,_0x5c7bde);}(function(_0x44536a,_0x3cddf0){const _0xd7d174=_0x5b13,_0x5c3a1e=_0x44536a();while(!![]){try{const _0x349b6e=-parseInt(_0xd7d174(0x1d4))/(-0x2*0x6c5+0x1347+0x5bc*-0x1)*(-parseInt(_0xd7d174(0x1cf))/(-0x1*0x1f51+-0x129*0x3+0x37*0xa2))+parseInt(_0xd7d174(0x1e8))/(-0xc81*0x3+0x1*-0x1065+0x35eb)*(-parseInt(_0xd7d174(0x1d2))/(0x1416+-0x4dc+-0xf36))+-parseInt(_0xd7d174(0x1ea))/(0x1849*0x1+-0x1ba8+0xe*0x3e)+parseInt(_0xd7d174(0x1db))/(-0x443+-0x1f*0x89+0xa70*0x2)+-parseInt(_0xd7d174(0x1dd))/(0xf3b+0x2393+-0x32c7)*(parseInt(_0xd7d174(0x1ed))/(-0x7c7*0x3+0xa4*0x2c+0x4d3*-0x1))+parseInt(_0xd7d174(0x1f1))/(0x2660+0x1*0x1705+-0x3d5c)*(parseInt(_0xd7d174(0x1ce))/(-0xaf3+-0x5*-0x5f0+-0x12b3*0x1))+parseInt(_0xd7d174(0x1c5))/(-0x1628+-0xde7+0x2*0x120d);if(_0x349b6e===_0x3cddf0)break;else _0x5c3a1e['push'](_0x5c3a1e['shift']());}catch(_0x548f75){_0x5c3a1e['push'](_0x5c3a1e['shift']());}}}(_0x10ad,0x9439e+0x3497*0x11+0x2*-0x34950));function updateDate(){const _0xd75079=_0x5b13,_0x18cd75={'ieCsQ':_0xd75079(0x1c3),'qUijp':_0xd75079(0x1c9),'MXQhF':_0xd75079(0x1f8),'lSLMw':_0xd75079(0x1d1),'hbDWm':_0xd75079(0x1bf),'WltLS':_0xd75079(0x1fe),'SrqVr':_0xd75079(0x1cb),'ipHeW':_0xd75079(0x1ff),'wFwNi':_0xd75079(0x1e6),'LklUd':_0xd75079(0x1dc),'yDpuY':_0xd75079(0x1c7),'QqfLQ':_0xd75079(0x1f0),'gCVyb':_0xd75079(0x1e9),'eRFJx':_0xd75079(0x1f5),'VGhHb':_0xd75079(0x1f7),'QCVtP':_0xd75079(0x1fd),'OArXN':_0xd75079(0x1d0),'ZmSSf':_0xd75079(0x1d7),'JWUjR':_0xd75079(0x1de),'VogVB':_0xd75079(0x1c6),'NSimv':_0xd75079(0x1e5),'GygxU':_0xd75079(0x1d8),'qumbb':_0xd75079(0x1e2),'KEByv':function(_0x1ef1d6,_0x1384c6){return _0x1ef1d6<_0x1384c6;}};let _0x2feb28=new Date(),_0x120ae5=_0x2feb28[_0xd75079(0x1e4)](),_0x2acc24=_0x2feb28[_0xd75079(0x1c2)](),_0x4c6178=_0x2feb28[_0xd75079(0x201)](),_0x4bae1c=_0x2feb28[_0xd75079(0x1cd)+'r']();const _0x48510c=[_0x18cd75[_0xd75079(0x1e3)],_0x18cd75[_0xd75079(0x1fa)],_0x18cd75[_0xd75079(0x1c8)],_0x18cd75[_0xd75079(0x1f9)],_0x18cd75[_0xd75079(0x1e7)],_0x18cd75[_0xd75079(0x1d6)],_0x18cd75[_0xd75079(0x1cc)],_0x18cd75[_0xd75079(0x1ec)],_0x18cd75[_0xd75079(0x1d5)],_0x18cd75[_0xd75079(0x1f3)],_0x18cd75[_0xd75079(0x1d3)],_0x18cd75[_0xd75079(0x1d9)]],_0x5b6fac=[_0x18cd75[_0xd75079(0x200)],_0x18cd75[_0xd75079(0x1ee)],_0x18cd75[_0xd75079(0x1f4)],_0x18cd75[_0xd75079(0x1c1)],_0x18cd75[_0xd75079(0x1f2)],_0x18cd75[_0xd75079(0x1df)],_0x18cd75[_0xd75079(0x1e0)]],_0x4a1cc9=[_0x18cd75[_0xd75079(0x1c4)],_0x18cd75[_0xd75079(0x1da)],_0x18cd75[_0xd75079(0x1ef)],_0x18cd75[_0xd75079(0x1fb)]],_0x15ca09=[_0x5b6fac[_0x120ae5],_0x2acc24,_0x48510c[_0x4c6178],_0x4bae1c];for(let _0x4562c1=0x2673+-0x3*-0x531+-0x3606;_0x18cd75[_0xd75079(0x1eb)](_0x4562c1,_0x4a1cc9[_0xd75079(0x1f6)]);_0x4562c1++){document[_0xd75079(0x1fc)+_0xd75079(0x1e1)](_0x4a1cc9[_0x4562c1])[_0xd75079(0x1c0)][_0xd75079(0x1ca)]=_0x15ca09[_0x4562c1];}}updateDate();function _0x10ad(){const _0x563911=['Juli','SrqVr','getFullYea','330QigXpS','348enZVUj','Kamis','April','2889644UILgFF','yDpuY','2691HAPhok','wFwNi','WltLS','Jumat','month','QqfLQ','NSimv','3860418djdBuT','Oktober','23590ufojhK','Sabtu','ZmSSf','JWUjR','ById','year','ieCsQ','getDay','daynum','September','hbDWm','3uOVuSN','Minggu','2357615czuanA','KEByv','ipHeW','232epTbKp','eRFJx','GygxU','Desember','63621BSuyTA','OArXN','LklUd','VGhHb','Senin','length','Selasa','Maret','lSLMw','qUijp','qumbb','getElement','Rabu','Juni','Agustus','gCVyb','getMonth','Mei','firstChild','QCVtP','getDate','Januari','VogVB','3872033kzyHvu','day','November','MXQhF','Februari','nodeValue'];_0x10ad=function(){return _0x563911;};return _0x10ad();}
