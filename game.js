class CityGame {
    constructor() {
        this.cities = {};
        this.currentLang = 'ru';
        this.lives = 3;
        this.score = 0;
        this.timeLeft = 30;
        this.usedCities = [];
        this.currentCountry = null;
        this.currentLetter = null;
        this.timer = null;
        this.lastLoginDate = null;
        this.timerInterval = null;
        this.pausedTimeLeft = 0;
        this.isPaused = false;
        
        this.initElements();
        this.loadGame();
        this.setupEventListeners();
    }

    
    initElements() {
        this.elements = {
            countryScreen: document.getElementById('country-screen'),
            gameScreen: document.getElementById('game-screen'),
            endScreen: document.getElementById('end-screen'),
            countriesContainer: document.getElementById('countries-container'),
            livesDisplay: document.getElementById('lives'),
            scoreDisplay: document.getElementById('score'),
            timerDisplay: document.getElementById('timer'),
            cityInput: document.getElementById('city-input'),
            submitBtn: document.getElementById('submit-btn'),
            lastCityDisplay: document.getElementById('last-city'),
            currentLetterDisplay: document.getElementById('current-letter'),
            countryFlag: document.getElementById('country-flag'),
            countryName: document.getElementById('country-name'),
            progressBar: document.getElementById('progress-bar'),
            notification: document.getElementById('notification'),
            finalScore: document.getElementById('final_score'),
            playAgainBtn: document.getElementById('play-again-btn'),
            menuBtn: document.getElementById('menu-btn'),
            langButtons: document.querySelectorAll('.lang-btn')
        };
    }
    
    async loadGame() {
        await this.loadCities();
        this.checkDailyLifeReset();
        this.updateUI();
        this.showScreen('country');
    }
    
    async loadCities() {
        try {
            const response = await fetch('cities.json');
            this.cities = await response.json();
            this.renderCountryCards();
        } catch (error) {
            console.error("Ошибка загрузки городов:", error);
        }
    }
    
    renderCountryCards() {
        this.elements.countriesContainer.innerHTML = '';
        
        Object.keys(this.cities).forEach(country => {
            const countryData = this.cities[country];
            const card = document.createElement('div');
            card.className = 'country-card';
            card.innerHTML = `
                <img src="flags/${countryData.flag}.svg" alt="${country}">
                <h3>${translations[this.currentLang].countries[country] || country}</h3>
                <small>${countryData.cities[this.currentLang]?.length || 0} ${translations[this.currentLang].cities}</small>
            `;
            
            card.addEventListener('click', () => {
                if (this.lives > 0) {
                this.selectCountry(country);
                this.showScreen('game');
            } else {
                this.showNotification(translations[this.currentLang].no_lives_left);
                this.showScreen('end');
            }  
            });
            
            this.elements.countriesContainer.appendChild(card);
        });
    }
    
    selectCountry(country) {
         if (this.lives <= 0) {
            this.showNotification(translations[this.currentLang].no_lives_left);
            return; // Не переходим на экран игры, если нет жизней
        }

        this.currentCountry = country;
        this.elements.countryName.textContent = translations[this.currentLang].countries[country] || country;
        this.elements.countryFlag.src = `flags/${this.cities[country].flag}.svg`;
        this.startGame();
        this.showScreen('game');
    }
    
    startGame() {
        if (this.lives <= 0) {
            this.showNotification(translations[this.currentLang].no_lives_left);
            this.showScreen('end');
            return;
        }

        this.score = 0;
        this.usedCities = [];
        this.nextCity();
        this.updateUI();
    }
    
    nextCity() {
        this.clearTimer();
        clearInterval(this.timer);
        
        const cities = this.getAvailableCities();
        if (cities.length === 0) {
            this.endGame(true);
            return;
        }
        
        // Первый ход - компьютер начинает
        if (this.usedCities.length === 0) {
            const city = cities[Math.floor(Math.random() * cities.length)];
            this.processComputerMove(city);
            return;
        }
        
        this.startTimer();
    }
    
    processComputerMove(city) {
        this.usedCities.push(city.toLowerCase());
        this.elements.lastCityDisplay.textContent = `${translations[this.currentLang].computer_named}: ${city}`;
        this.currentLetter = this.getLastLetter(city);
        this.elements.currentLetterDisplay.textContent = this.currentLetter.toUpperCase();
        this.startTimer();
    }
    
    getLastLetter(city) {
        let lastLetter = city.slice(-1).toLowerCase();
        if (['ь', 'ъ', 'ы', 'й'].includes(lastLetter)) {
            lastLetter = city.slice(-2, -1).toLowerCase();
            if (['ь', 'ъ', 'ы', 'й'].includes(lastLetter)) {
                lastLetter = city.slice(-3, -2).toLowerCase();
        }
        }
        return lastLetter;
    }
    
    getAvailableCities() {
        const countryData = this.cities[this.currentCountry];
        if (!countryData) return [];
        
        const cities = countryData.cities[this.currentLang] || countryData.cities['ru'] || [];
        return cities.filter(city => {
            const lowerCity = city.toLowerCase();
            return !this.usedCities.includes(lowerCity) && 
                   (!this.currentLetter || lowerCity.startsWith(this.currentLetter));
        });
    }
    
    startTimer() {
         this.clearTimer();
         this.isPaused = false;
         this.timeLeft = 30;

         this.updateTimer();
        
         this.timerInterval = window.setInterval(() => {
            if (!this.isPaused) {
                this.timeLeft--;
                this.updateTimer();
                if (this.timeLeft <= 0) {
                    this.loseLife();
                }            
            }
        }, 1000);
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimer() {
        this.elements.timerDisplay.textContent = this.timeLeft;
        this.elements.progressBar.style.width = `${(this.timeLeft / 30) * 100}%`;
        
        if (this.timeLeft <= 5) {
            this.elements.timerDisplay.classList.add('warning');
        } else {
            this.elements.timerDisplay.classList.remove('warning');
        }
    }
    
    handleSubmit() {
        const city = this.elements.cityInput.value.trim();
        if (this.validateCity(city)) {
            this.processPlayerMove(city);
            this.startTimer();
        } else {
            this.loseLife();
        }
    }
    
    validateCity(city) {
        if (!city) {
            this.showNotification(translations[this.currentLang].enter_city);
            return false;
        }
        
        const countryData = this.cities[this.currentCountry];
        const cities = countryData.cities[this.currentLang] || countryData.cities['en'] || [];
        const lowerCity = city.toLowerCase();
        
        // Проверка существования города
        if (!cities.some(c => c.toLowerCase() === lowerCity)) {
            this.showNotification(translations[this.currentLang].invalid_city);
            return false;
        }
        
        // Проверка на повтор
        if (this.usedCities.includes(lowerCity)) {
            this.showNotification(translations[this.currentLang].city_used);
            return false;
        }
        
        // Проверка первой буквы
        if (this.currentLetter && !lowerCity.startsWith(this.currentLetter)) {
            this.showNotification(`${translations[this.currentLang].must_start_with} "${this.currentLetter.toUpperCase()}"`);
            return false;
        }
        
        return true;
    }
    
    processPlayerMove(city) {
        this.usedCities.push(city.toLowerCase());
        this.elements.lastCityDisplay.textContent = `${translations[this.currentLang].you_named}: ${city}`;
        this.currentLetter = this.getLastLetter(city);
        this.elements.cityInput.value = '';
        this.score += 10;
        
        // Ход компьютера
        setTimeout(() => {
            this.computerMove();
        }, 1500);
        
        this.updateUI();
    }
    
    computerMove() {
        const cities = this.getAvailableCities();
        if (cities.length > 0) {
            const city = cities[Math.floor(Math.random() * cities.length)];
            this.processComputerMove(city);
        } else {
            this.showNotification(translations[this.currentLang].computer_no_city);
            this.endGame(true);
        }
        
        this.updateUI();
    }
    
    loseLife() {
        this.clearTimer();
        this.lives--;
        clearInterval(this.timer);
        
        if (this.lives <= 0) {
            this.endGame(false);
        } else {
            this.showNotification(translations[this.currentLang].lost_life);
            this.timeLeft = 30;
            this.startTimer();
        }
        
        this.updateUI();
    }
    
    endGame(isWin) {
         this.clearTimer();
        clearInterval(this.timer);
        this.showScreen('end');
        
        this.elements.finalScore.textContent = this.score;
        document.getElementById('result-title').textContent = 
            isWin ? translations[this.currentLang].you_win : translations[this.currentLang].game_over;
        
        this.saveProgress();
    }
    
    saveProgress() {
        const progress = {
            score: this.score,
            lives: this.lives,
            lastLogin: new Date().toISOString()
        };
        
        localStorage.setItem('cities_game_progress', JSON.stringify(progress));
    }
    
    loadProgress() {
        const progress = JSON.parse(localStorage.getItem('cities_game_progress'));
        if (progress) {
            this.score = progress.score || 0;
            this.lastLoginDate = progress.lastLogin ? new Date(progress.lastLogin) : null;
            this.checkDailyLifeReset();
        }
    }
    
    checkDailyLifeReset() {
        const today = new Date().toDateString();
        if (!this.lastLoginDate || this.lastLoginDate.toDateString() !== today) {
            this.lives = 3;
            this.lastLoginDate = new Date();
        }
    }
    
    showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screen}-screen`).classList.add('active');
    }
    
    showNotification(message) {
        this.elements.notification.textContent = message;
        this.elements.notification.classList.add('show');
        
        setTimeout(() => {
            this.elements.notification.classList.remove('show');
        }, 3000);
    }
    
    updateUI() {
        this.elements.scoreDisplay.textContent = this.score;
        this.elements.livesDisplay.innerHTML = '❤️'.repeat(this.lives);
    }
    
    setupEventListeners() {
        this.elements.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.elements.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSubmit();
        });
        
        this.elements.playAgainBtn.addEventListener('click', () => {
            if (this.lives !== 0) {
                this.startGame();
                this.showScreen('game');
            }    
        });
        
        this.elements.menuBtn.addEventListener('click', () => {
            this.showScreen('country');
        });
        
        this.elements.langButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentLang = btn.dataset.lang;
                this.updateTranslations();
                this.renderCountryCards();
            });
        });

        document.getElementById('back-to-country-btn').addEventListener('click', () => {
        this.pauseTimer();
        document.getElementById('confirm-modal').style.display = 'flex';
    });

    document.getElementById('cancel-leave').addEventListener('click', () => {
        document.getElementById('confirm-modal').style.display = 'none';
        this.resumeTimer();
    });

    document.getElementById('confirm-leave').addEventListener('click', () => {
        this.clearTimer();
        this.resetGame();
        document.getElementById('confirm-modal').style.display = 'none';
        this.showScreen('country');
    });

    document.getElementById('reward-ad-btn').addEventListener('click', async () => {
        if (this.lives <= 2) {
            this.lives += 1;
            this.showNotification(translations[this.currentLang].add_live)
        } else {
            this.showNotification(translations[this.currentLang].max_lives)
            return
        }
        
    });

    }
    
    updateTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = translations[this.currentLang][key] || key;
        });
        
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = translations[this.currentLang][key] || key;
        });
    }

    pauseTimer() {
    this.isPaused = true;
    this.elements.timerDisplay.classList.add('timer-paused');
    }

    resumeTimer() {
    this.isPaused = false;
    this.elements.timerDisplay.classList.remove('timer-paused');
    }

    resetGame() {
        this.score = 0;
        this.isPaused = false;
        this.usedCities = [];
        this.clearTimer();
        this.updateUI();
        this.elements.timerDisplay.classList.remove('timer-paused');
    }
}


// Запуск игры при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    const game = new CityGame();
});