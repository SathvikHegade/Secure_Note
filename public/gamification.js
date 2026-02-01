// ============================================
// GAMIFICATION SYSTEM
// ============================================

class GamificationSystem {
    constructor() {
        this.storageKey = 'securenote_gamification';
        this.data = this.loadData();
        this.achievements = this.defineAchievements();
        this.init();
    }

    init() {
        // Start session timer
        this.sessionStart = Date.now();
        this.sessionInterval = setInterval(() => {
            this.updateSessionTime();
        }, 60000); // Update every minute

        // Track page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseSession();
            } else {
                this.resumeSession();
            }
        });

        // Save data before page unload
        window.addEventListener('beforeunload', () => {
            this.saveSession();
        });
    }

    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse gamification data:', e);
            }
        }
        return this.getDefaultData();
    }

    getDefaultData() {
        return {
            stats: {
                totalWords: 0,
                totalCharacters: 0,
                totalNotes: 0,
                totalFiles: 0,
                totalSessions: 0,
                totalTime: 0 // in minutes
            },
            achievements: {},
            goals: {
                dailyWords: 500,
                weeklyNotes: 5
            },
            progress: {
                wordsToday: 0,
                notesThisWeek: 0,
                lastReset: Date.now()
            }
        };
    }
    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save gamification data:', e);
        }
    }

    // ============================================
    // STATS TRACKING
    // ============================================

    trackWordCount(count) {
        // Simply track the current word count in the editor
        this.data.stats.totalWords = count;
        this.checkAchievements('words', count);
        this.saveData();
    }

    trackCharacterCount(count) {
        // Simply track the current character count
        this.data.stats.totalCharacters = count;
        this.saveData();
    }
    trackNoteCreated() {
        this.data.stats.totalNotes++;
        this.data.progress.notesThisWeek++;
        this.checkAchievements('notes', this.data.stats.totalNotes);
        this.saveData();
    }

    trackFileUpload() {
        // File count is now synced via renderFiles() to avoid conflicts
        // Just trigger achievement check
        this.checkAchievements('files', this.data.stats.totalFiles);
        this.saveData();
    }

    updateSessionTime() {
        const now = Date.now();
        const elapsed = Math.floor((now - this.sessionStart) / 60000);
        this.data.stats.totalTime += 1;
        this.saveData();
    }

    saveSession() {
        this.updateSessionTime();
        this.data.stats.totalSessions++;
        this.saveData();
    }

    pauseSession() {
        this.updateSessionTime();
        clearInterval(this.sessionInterval);
    }

    resumeSession() {
        this.sessionStart = Date.now();
        this.sessionInterval = setInterval(() => {
            this.updateSessionTime();
        }, 60000);
    }

    // ============================================
    // ACHIEVEMENTS
    // ============================================

    defineAchievements() {
        return {
            firstNote: {
                id: 'firstNote',
                name: 'First Steps',
                description: 'Create your first note',
                icon: '📝',
                condition: (type, value) => type === 'notes' && value >= 1
            },
            wordsmith: {
                id: 'wordsmith',
                name: 'Wordsmith',
                description: 'Write 1,000 words',
                icon: '✍️',
                condition: (type, value) => type === 'words' && value >= 1000
            },
            prolificWriter: {
                id: 'prolificWriter',
                name: 'Prolific Writer',
                description: 'Write 10,000 words',
                icon: '📚',
                condition: (type, value) => type === 'words' && value >= 10000
            },
            novelist: {
                id: 'novelist',
                name: 'Novelist',
                description: 'Write 50,000 words',
                icon: '🏆',
                condition: (type, value) => type === 'words' && value >= 50000
            },
            organizer: {
                id: 'organizer',
                name: 'Organized',
                description: 'Upload 10 files',
                icon: '📁',
                condition: (type, value) => type === 'files' && value >= 10
            },
            collector: {
                id: 'collector',
                name: 'Collector',
                description: 'Upload 50 files',
                icon: '🗂️',
                condition: (type, value) => type === 'files' && value >= 50
            },
            marathon: {
                id: 'marathon',
                name: 'Marathon Writer',
                description: 'Write for 60 minutes in one session',
                icon: '⏱️',
                condition: (type, value) => type === 'session' && value >= 60
            }
        };
    }

    checkAchievements(type, value) {
        const newAchievements = [];

        Object.values(this.achievements).forEach(achievement => {
            if (!this.data.achievements[achievement.id]) {
                if (achievement.condition(type, value)) {
                    this.data.achievements[achievement.id] = {
                        unlockedAt: Date.now(),
                        seen: false
                    };
                    newAchievements.push(achievement);
                }
            }
        });

        if (newAchievements.length > 0) {
            this.showAchievementNotification(newAchievements);
        }
    }

    showAchievementNotification(achievements) {
        achievements.forEach(achievement => {
            if (window.toast) {
                window.toast.show(
                    `🎉 Achievement Unlocked: ${achievement.icon} ${achievement.name}`,
                    'success',
                    5000
                );
            }
        });
    }

    getUnlockedAchievements() {
        return Object.entries(this.data.achievements)
            .filter(([id, data]) => data)
            .map(([id, data]) => ({
                ...this.achievements[id],
                unlockedAt: data.unlockedAt
            }));
    }

    getAllAchievements() {
        return Object.values(this.achievements).map(achievement => ({
            ...achievement,
            unlocked: !!this.data.achievements[achievement.id],
            unlockedAt: this.data.achievements[achievement.id]?.unlockedAt
        }));
    }

    // ============================================
    // GOALS
    // ============================================

    setGoal(type, value) {
        this.data.goals[type] = value;
        this.saveData();
    }

    getGoalProgress(type) {
        const goal = this.data.goals[type];
        const progress = this.data.progress[type] || 0;
        return {
            goal,
            progress,
            percentage: goal > 0 ? Math.min((progress / goal) * 100, 100) : 0,
            completed: progress >= goal
        };
    }

    resetDailyProgress() {
        const now = Date.now();
        const lastReset = this.data.progress.lastReset || 0;
        const daysSince = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

        if (daysSince >= 1) {
            this.data.progress.wordsToday = 0;
            this.data.progress.lastReset = now;
            this.saveData();
        }
    }

    resetWeeklyProgress() {
        const now = Date.now();
        const lastReset = this.data.progress.lastReset || 0;
        const weeksSince = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24 * 7));

        if (weeksSince >= 1) {
            this.data.progress.notesThisWeek = 0;
            this.saveData();
        }
    }

    // ============================================
    // STATS DISPLAY
    // ============================================

    getStats() {
        return { ...this.data.stats };
    }

    getDashboardData() {
        return {
            stats: this.getStats(),
            achievements: this.getUnlockedAchievements(),
            goals: {
                daily: this.getGoalProgress('dailyWords'),
                weekly: this.getGoalProgress('weeklyNotes')
            }
        };
    }

    // ============================================
    // MOTIVATIONAL PROMPTS
    // ============================================

    getMotivationalPrompt() {
        const prompts = [
            "Keep writing! You're doing great! 💪",
            "Every word counts. Keep going! ✨",
            "You're on a roll! Don't stop now! 🚀",
            "Great progress today! Keep it up! 🌟",
            "Writing is thinking. Keep those thoughts flowing! 💭",
            "One word at a time. You've got this! ✍️",
            "Your ideas matter. Keep writing! 💡",
            "Making progress every day! 📈",
            "The more you write, the better you get! 📝",
            "Keep pushing forward! Success is near! 🎯"
        ];

        return prompts[Math.floor(Math.random() * prompts.length)];
    }

    shouldShowMotivation() {
        const lastShown = localStorage.getItem('lastMotivation');
        if (!lastShown) return true;

        const timeSince = Date.now() - parseInt(lastShown);
        const fiveMinutes = 5 * 60 * 1000;

        return timeSince > fiveMinutes;
    }

    showMotivation() {
        if (this.shouldShowMotivation()) {
            const prompt = this.getMotivationalPrompt();
            if (window.toast) {
                window.toast.info(prompt, 4000);
            }
            localStorage.setItem('lastMotivation', Date.now().toString());
        }
    }

    // ============================================
    // RENDER UI
    // ============================================

    renderStatsWidget(container) {
        const stats = this.getStats();
        const html = `
      <div class="stats-widget">
        <h3>Your Stats</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${this.formatNumber(stats.totalWords)}</div>
            <div class="stat-label">Words Written</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.totalFiles}</div>
            <div class="stat-label">Files Uploaded</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m</div>
            <div class="stat-label">Time Spent</div>
          </div>
        </div>
      </div>
    `;

        if (container) {
            container.innerHTML = html;
        }
        return html;
    }

    renderAchievements(container) {
        const achievements = this.getAllAchievements();
        const html = `
      <div class="achievements-widget">
        <h3>Achievements</h3>
        <div class="achievements-grid">
          ${achievements.map(a => `
            <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
              <div class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</div>
              <div class="achievement-name">${a.name}</div>
              <div class="achievement-desc">${a.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

        if (container) {
            container.innerHTML = html;
        }
        return html;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

// Initialize global gamification instance
if (typeof window !== 'undefined') {
    window.gamification = new GamificationSystem();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamificationSystem;
}
