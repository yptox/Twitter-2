// --- GAME STATE & CONFIGURATION ---
let engagementPoints = 0;
let totalTweets = 0;
let gameState = {};
let gameStartTime = 0;
let nathanTweets = [];
let autoSaveIntervalId = null; 

let DOMElements = {};
const MAX_TWEETS_ON_FEED = 40;
const NATHAN_IMAGE_COUNT = 37;
const IMAGE_TWEET_CHANCE = 0.05;
const BLOCK_NATHAN_COST = 10000;

const INITIAL_STATE = {
    nathanProfilePicSrc: "images/NathanImage7.png",
    nathanBioText: "love to post",
    epPerLike: 1, epPerRepost: 3, epPerBookmark: 5, epPerSponsor: 10,
    repostUnlocked: false, unlockRepostCost: 50,
    bookmarkUnlocked: false, unlockBookmarkCost: 250,
    sponsorTweetUnlocked: false, unlockSponsorCost: 1000, 
    
    likeBot: { unlocked: false, active: false, cost: 25, intervalMs: 3000, intervalId: null, progress: 0 },
    repostBot: { unlocked: false, active: false, cost: 150, intervalMs: 5000, intervalId: null, progress: 0 },
    bookmarkBot: { unlocked: false, active: false, cost: 750, intervalMs: 8000, intervalId: null, progress: 0 },
    sponsorBot: { unlocked: false, active: false, cost: 3000, intervalMs: 12000, intervalId: null, progress: 0 },
    
    nathanIsTweetingAutomatically: false,
    nathanTweetIntervalId: null,
    NATHAN_TWEET_INTERVAL_MS: 7000,
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // Cache DOM Elements
    DOMElements = {
        engagementPointsDisplay: document.getElementById('engagementPointsDisplay'),
        totalTweetsDisplay: document.getElementById('totalTweetsDisplay'),
        nathanBioDisplay: document.getElementById('nathanBio'),
        profilePicMain: document.getElementById('profilePicMain'),
        tweetFeed: document.getElementById('tweetFeed'),
        notificationsList: document.getElementById('notificationsList'),
        upgradesList: document.getElementById('upgradesList'),
        likeBotStatusDisplay: document.getElementById('likeBotStatusDisplay'),
        repostBotStatusDisplay: document.getElementById('repostBotStatusDisplay'),
        bookmarkBotStatusDisplay: document.getElementById('bookmarkBotStatusDisplay'),
        sponsorBotStatusDisplay: document.getElementById('sponsorBotStatusDisplay'),
        blockNathanButton: document.getElementById('blockNathanButton'),
        resetGameButton: document.getElementById('resetGameButton'),
        gameContainer: document.getElementById('gameContainer'),
        endScreen: document.getElementById('endScreen'),
        finalTimeDisplay: document.getElementById('finalTimeDisplay'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        sunIcon: document.getElementById('sun-icon'),
        moonIcon: document.getElementById('moon-icon'),

        // Upgrade Elements
        upgradeRepost: document.getElementById('upgrade-repost'),
        upgradeRepostButton: document.getElementById('upgrade-repost-button'),
        upgradeBookmark: document.getElementById('upgrade-bookmark'),
        upgradeBookmarkButton: document.getElementById('upgrade-bookmark-button'),
        upgradeSponsor: document.getElementById('upgrade-sponsor'),
        upgradeSponsorButton: document.getElementById('upgrade-sponsor-button'),
        
        upgradeLikeBotUnlock: document.getElementById('upgrade-likebot-unlock'),
        upgradeLikeBotUnlockButton: document.getElementById('upgrade-likebot-unlock-button'),
        upgradeRepostBotUnlock: document.getElementById('upgrade-repostbot-unlock'),
        upgradeRepostBotUnlockButton: document.getElementById('upgrade-repostbot-unlock-button'),
        upgradeBookmarkBotUnlock: document.getElementById('upgrade-bookmarkbot-unlock'),
        upgradeBookmarkBotUnlockButton: document.getElementById('upgrade-bookmarkbot-unlock-button'),
        upgradeSponsorBotUnlock: document.getElementById('upgrade-sponsorbot-unlock'),
        upgradeSponsorBotUnlockButton: document.getElementById('upgrade-sponsorbot-unlock-button'),

        upgradeLikeBotToggle: document.getElementById('upgrade-likebot-toggle'),
        upgradeLikeBotToggleButton: document.getElementById('upgrade-likebot-toggle-button'),
        upgradeRepostBotToggle: document.getElementById('upgrade-repostbot-toggle'),
        upgradeRepostBotToggleButton: document.getElementById('upgrade-repostbot-toggle-button'),
        upgradeBookmarkBotToggle: document.getElementById('upgrade-bookmarkbot-toggle'),
        upgradeBookmarkBotToggleButton: document.getElementById('upgrade-bookmarkbot-toggle-button'),
        upgradeSponsorBotToggle: document.getElementById('upgrade-sponsorbot-toggle'),
        upgradeSponsorBotToggleButton: document.getElementById('upgrade-sponsorbot-toggle-button'),
    };
    
    // Fetch tweet data
    try {
        const response = await fetch('NathanTweets.txt');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        nathanTweets = text.split('\n').filter(line => line.trim() !== '');
    } catch (e) {
        console.error("Could not load NathanTweets.txt:", e);
        nathanTweets = ["Error: Could not load tweets.", "Nathan is at a loss for words."];
    }
    
    // Add event listeners
    DOMElements.blockNathanButton.addEventListener('click', blockNathan);
    DOMElements.resetGameButton.addEventListener('click', resetGame);
    DOMElements.darkModeToggle.addEventListener('click', toggleDarkMode);

    const upgradesHeader = document.getElementById('upgradesHeaderButton');
    const notificationsHeader = document.getElementById('notificationsHeaderButton');
    const upgradesArea = document.getElementById('upgradesArea');
    const notificationsArea = document.getElementById('activityNotificationsArea');
    const upgradesList = document.getElementById('upgradesList');
    const notificationsList = document.getElementById('notificationsList');

    DOMElements.upgradeRepostButton.addEventListener('click', () => purchaseInteractionUnlock('Repost'));
    DOMElements.upgradeBookmarkButton.addEventListener('click', () => purchaseInteractionUnlock('Bookmark'));
    DOMElements.upgradeSponsorButton.addEventListener('click', () => purchaseInteractionUnlock('Sponsor'));

    DOMElements.upgradeLikeBotUnlockButton.addEventListener('click', purchaseLikeBotUnlock);
    DOMElements.upgradeRepostBotUnlockButton.addEventListener('click', purchaseRepostBotUnlock);
    DOMElements.upgradeBookmarkBotUnlockButton.addEventListener('click', purchaseBookmarkBotUnlock);
    DOMElements.upgradeSponsorBotUnlockButton.addEventListener('click', purchaseSponsorBotUnlock);

    DOMElements.upgradeLikeBotToggleButton.addEventListener('click', toggleLikeBot);
    DOMElements.upgradeRepostBotToggleButton.addEventListener('click', toggleRepostBot);
    DOMElements.upgradeBookmarkBotToggleButton.addEventListener('click', toggleBookmarkBot);
    DOMElements.upgradeSponsorBotToggleButton.addEventListener('click', toggleSponsorBot);
    
    // --- START OF MOBILE TAB-VIEW LOGIC ---
    const mainLayout = document.querySelector('.main-layout');
    const tabTimeline = document.getElementById('main-view-tab-timeline');
    const tabUpgrades = document.getElementById('main-view-tab-upgrades');

    function setMobileView(view) {
        if (view === 'timeline') {
            mainLayout.classList.remove('upgrades-view-active');
            tabTimeline.classList.add('active');
            tabUpgrades.classList.remove('active');
        } else {
            mainLayout.classList.add('upgrades-view-active');
            tabTimeline.classList.remove('active');
            tabUpgrades.classList.add('active');
        }
    }

    tabTimeline.addEventListener('click', () => setMobileView('timeline'));
    tabUpgrades.addEventListener('click', () => setMobileView('upgrades'));
    // --- END OF MOBILE TAB-VIEW LOGIC ---

    // Welcome Modal
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeModalCloseButton = document.getElementById('welcomeModalCloseButton');

    welcomeModalCloseButton.addEventListener('click', () => {
        welcomeModal.style.display = 'none';
        localStorage.setItem('nathansTwitterWelcome_v1', 'true');
    });

    loadGame();

    if (!localStorage.getItem('nathansTwitterWelcome_v1')) {
        welcomeModal.style.display = 'flex';
    }
    
    if (!DOMElements.tweetFeed.querySelector('.tweet')) {
        createAndAppendTweet();
    }
});

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    DOMElements.sunIcon.style.display = isDarkMode ? 'none' : 'block';
    DOMElements.moonIcon.style.display = isDarkMode ? 'block' : 'none';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// --- SAVE/LOAD ---
function saveGame() {
    try {
        let stateToSave = { ...gameState };
        stateToSave.engagementPoints = engagementPoints;
        stateToSave.totalTweets = totalTweets;
        stateToSave.gameStartTime = gameStartTime;
        ['likeBot', 'repostBot', 'bookmarkBot', 'sponsorBot', 'nathanTweet'].forEach(key => {
            if (stateToSave[key] && stateToSave[key].intervalId) stateToSave[key].intervalId = null;
        });
        localStorage.setItem('nathansTwitter2Save_v1.5', JSON.stringify(stateToSave));
    } catch (e) { console.error("Save failed:", e); }
}

function loadGame() {
    try {
        const saved = localStorage.getItem('nathansTwitter2Save_v1.5');
        if (saved) {
            const parsed = JSON.parse(saved);
            gameState = {
                ...JSON.parse(JSON.stringify(INITIAL_STATE)),
                ...parsed,
                likeBot: { ...INITIAL_STATE.likeBot, ...parsed.likeBot },
                repostBot: { ...INITIAL_STATE.repostBot, ...parsed.repostBot },
                bookmarkBot: { ...INITIAL_STATE.bookmarkBot, ...parsed.bookmarkBot },
                sponsorBot: { ...INITIAL_STATE.sponsorBot, ...parsed.sponsorBot },
            };
            engagementPoints = parsed.engagementPoints || 0;
            totalTweets = parsed.totalTweets || 0;
            gameStartTime = parsed.gameStartTime || Date.now();
        } else {
            gameState = JSON.parse(JSON.stringify(INITIAL_STATE));
            gameStartTime = Date.now();
        }
    } catch (e) {
        console.error("Load failed, initializing new game state:", e);
        gameState = JSON.parse(JSON.stringify(INITIAL_STATE));
        gameStartTime = Date.now();
    }
    DOMElements.profilePicMain.src = gameState.nathanProfilePicSrc || INITIAL_STATE.nathanProfilePicSrc;
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    DOMElements.sunIcon.style.display = isDarkMode ? 'none' : 'block';
    DOMElements.moonIcon.style.display = isDarkMode ? 'block' : 'none';
    restartAllBotIntervals();
    updateAllDisplays();
    window.addEventListener('beforeunload', saveGame);
    autoSaveIntervalId = setInterval(saveGame, 15000);
}

// --- CORE INTERACTION & TWEET CREATION ---
function createClickPopup(text, options) {
    const popup = document.createElement('div');
    popup.innerHTML = text; popup.className = 'click-popup';
    document.body.appendChild(popup);
    const rect = options.target.getBoundingClientRect();
    popup.style.left = `${rect.left + (rect.width / 2) - (popup.offsetWidth / 2)}px`;
    popup.style.top = `${rect.top - popup.offsetHeight}px`;
    setTimeout(() => popup.remove(), 1100);
}

function handleInteraction(buttonElement, interactionType) {
    let epGained = 0;
    let completedText = '';
    switch (interactionType) {
        case 'Like': epGained = gameState.epPerLike; completedText = '❤️ Liked!'; break;
        case 'Repost': epGained = gameState.epPerRepost; completedText = '🔁 Reposted!'; break;
        case 'Bookmark': epGained = gameState.epPerBookmark; completedText = '🔖 Bookmarked!'; break;
        case 'Sponsor': epGained = gameState.epPerSponsor; completedText = '⭐ Sponsored!'; break;
    }
    engagementPoints += epGained;
    buttonElement.innerHTML = completedText;
    buttonElement.classList.add('interaction-complete');
    buttonElement.disabled = true;
    createClickPopup(`+${epGained} EP`, { target: buttonElement });
    if (interactionType === 'Like') {
        addNotification("Your Like prompted Nathan to tweet!", "system");
        createAndAppendTweet();
    }
    updateAllDisplays();
}

function createAndAppendTweet() {
    const noTweetsMessage = DOMElements.tweetFeed.querySelector('.no-tweets-message');
    if (noTweetsMessage) {
        noTweetsMessage.remove();
    }

    totalTweets++;
    const tweetDiv = document.createElement('div'); tweetDiv.classList.add('tweet');
    const avatarContainer = document.createElement('div'); avatarContainer.classList.add('tweet-avatar-container');
    const authorImg = document.createElement('img'); authorImg.src = gameState.nathanProfilePicSrc; authorImg.alt = "Nathan Henry"; authorImg.classList.add('tweet-author-img');
    avatarContainer.appendChild(authorImg); tweetDiv.appendChild(avatarContainer);
    const mainContentDiv = document.createElement('div'); mainContentDiv.classList.add('tweet-main-content');
    const tweetHeader = document.createElement('div'); tweetHeader.classList.add('tweet-header');
    const authorDetailsDiv = document.createElement('div'); authorDetailsDiv.classList.add('tweet-author-details');
    const authorName = document.createElement('span'); authorName.classList.add('tweet-author-name'); authorName.textContent = "Nathan Henry";
    const authorHandle = document.createElement('span'); authorHandle.classList.add('tweet-author-handle'); authorHandle.textContent = "@Nathan9154438";
    authorDetailsDiv.appendChild(authorName); authorDetailsDiv.appendChild(authorHandle);
    tweetHeader.appendChild(authorDetailsDiv);
    const timestamp = document.createElement('span'); timestamp.classList.add('tweet-timestamp');
    timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    tweetHeader.appendChild(timestamp); mainContentDiv.appendChild(tweetHeader);
    const tweetData = generateNathanTweetData();
    if (tweetData.text) { const contentP = document.createElement('p'); contentP.classList.add('tweet-content'); contentP.textContent = tweetData.text; mainContentDiv.appendChild(contentP); }
    if (tweetData.image) { const ic = document.createElement('div'); ic.classList.add('tweet-image-container'); const ie = document.createElement('img'); ie.src = tweetData.image; ie.alt = "Nathan's Image"; ie.classList.add('tweet-image'); ic.appendChild(ie); mainContentDiv.appendChild(ic); }
    const buttonsContainer = document.createElement('div'); buttonsContainer.classList.add('interaction-buttons-container');
    const likeButton = document.createElement('button'); likeButton.classList.add('like-button'); likeButton.textContent = 'Like';
    likeButton.addEventListener('click', function() { handleInteraction(this, 'Like'); });
    buttonsContainer.appendChild(likeButton);
    if (gameState.repostUnlocked) { const rb = document.createElement('button'); rb.classList.add('repost-button'); rb.textContent = 'Repost'; rb.addEventListener('click', function() { handleInteraction(this, 'Repost'); }); buttonsContainer.appendChild(rb); }
    if (gameState.bookmarkUnlocked) { const bb = document.createElement('button'); bb.classList.add('bookmark-button'); bb.textContent = 'Bookmark'; bb.addEventListener('click', function() { handleInteraction(this, 'Bookmark'); }); buttonsContainer.appendChild(bb); }
    if (gameState.sponsorTweetUnlocked) { const sb = document.createElement('button'); sb.classList.add('sponsor-button'); sb.textContent = 'Sponsor'; sb.addEventListener('click', function() { handleInteraction(this, 'Sponsor'); }); buttonsContainer.appendChild(sb); }
    mainContentDiv.appendChild(buttonsContainer); tweetDiv.appendChild(mainContentDiv);
    DOMElements.tweetFeed.prepend(tweetDiv);
    while (DOMElements.tweetFeed.childElementCount > MAX_TWEETS_ON_FEED) {
        DOMElements.tweetFeed.removeChild(DOMElements.tweetFeed.lastChild);
    }
    updateAllDisplays();
}

function generateNathanTweetData() {
    if (nathanTweets.length === 0) return { text: "Nathan is thinking...", image: null };
    const text = nathanTweets[Math.floor(Math.random() * nathanTweets.length)];
    const image = (Math.random() < IMAGE_TWEET_CHANCE && NATHAN_IMAGE_COUNT > 0)
        ? `images/NathanImage${Math.floor(Math.random() * NATHAN_IMAGE_COUNT) + 1}.png`
        : null;
    return { text, image };
}

// --- UPGRADES ---
function updateUpgradesDisplay() {
    const ep = engagementPoints;

    // Interaction Unlocks
    DOMElements.upgradeRepost.style.display = !gameState.repostUnlocked ? 'block' : 'none';
    if (!gameState.repostUnlocked) {
        DOMElements.upgradeRepostButton.textContent = `Unlock Reposts (${formatNumber(gameState.unlockRepostCost)} EP)`;
        DOMElements.upgradeRepostButton.disabled = ep < gameState.unlockRepostCost;
    }

    const canShowBookmark = gameState.repostUnlocked && !gameState.bookmarkUnlocked;
    DOMElements.upgradeBookmark.style.display = canShowBookmark ? 'block' : 'none';
    if (canShowBookmark) {
        DOMElements.upgradeBookmarkButton.textContent = `Unlock Bookmarks (${formatNumber(gameState.unlockBookmarkCost)} EP)`;
        DOMElements.upgradeBookmarkButton.disabled = ep < gameState.unlockBookmarkCost;
    }

    const canShowSponsor = gameState.bookmarkUnlocked && !gameState.sponsorTweetUnlocked;
    DOMElements.upgradeSponsor.style.display = canShowSponsor ? 'block' : 'none';
    if (canShowSponsor) {
        DOMElements.upgradeSponsorButton.textContent = `Unlock Sponsors (${formatNumber(gameState.unlockSponsorCost)} EP)`;
        DOMElements.upgradeSponsorButton.disabled = ep < gameState.unlockSponsorCost;
    }


    // Bot Unlocks & Toggles
    DOMElements.upgradeLikeBotUnlock.style.display = !gameState.likeBot.unlocked ? 'block' : 'none';
    DOMElements.upgradeLikeBotToggle.style.display = gameState.likeBot.unlocked ? 'block' : 'none';
    if (!gameState.likeBot.unlocked) {
        DOMElements.upgradeLikeBotUnlockButton.textContent = `Unlock LikeBot (${formatNumber(gameState.likeBot.cost)} EP)`;
        DOMElements.upgradeLikeBotUnlockButton.disabled = ep < gameState.likeBot.cost;
    } else {
        DOMElements.upgradeLikeBotToggleButton.textContent = `Toggle LikeBot (${gameState.likeBot.active ? 'Active' : 'Paused'})`;
    }

    const canShowRepostBot = gameState.repostUnlocked;
    DOMElements.upgradeRepostBotUnlock.style.display = canShowRepostBot && !gameState.repostBot.unlocked ? 'block' : 'none';
    DOMElements.upgradeRepostBotToggle.style.display = canShowRepostBot && gameState.repostBot.unlocked ? 'block' : 'none';
    if (canShowRepostBot && !gameState.repostBot.unlocked) {
        DOMElements.upgradeRepostBotUnlockButton.textContent = `Unlock RepostBot (${formatNumber(gameState.repostBot.cost)} EP)`;
        DOMElements.upgradeRepostBotUnlockButton.disabled = ep < gameState.repostBot.cost;
    } else if (canShowRepostBot) {
        DOMElements.upgradeRepostBotToggleButton.textContent = `Toggle RepostBot (${gameState.repostBot.active ? 'Active' : 'Paused'})`;
    }

    const canShowBookmarkBot = gameState.bookmarkUnlocked;
    DOMElements.upgradeBookmarkBotUnlock.style.display = canShowBookmarkBot && !gameState.bookmarkBot.unlocked ? 'block' : 'none';
    DOMElements.upgradeBookmarkBotToggle.style.display = canShowBookmarkBot && gameState.bookmarkBot.unlocked ? 'block' : 'none';
    if (canShowBookmarkBot && !gameState.bookmarkBot.unlocked) {
        DOMElements.upgradeBookmarkBotUnlockButton.textContent = `Unlock BookmarkBot (${formatNumber(gameState.bookmarkBot.cost)} EP)`;
        DOMElements.upgradeBookmarkBotUnlockButton.disabled = ep < gameState.bookmarkBot.cost;
    } else if (canShowBookmarkBot) {
        DOMElements.upgradeBookmarkBotToggleButton.textContent = `Toggle BookmarkBot (${gameState.bookmarkBot.active ? 'Active' : 'Paused'})`;
    }

    const canShowSponsorBot = gameState.sponsorTweetUnlocked;
    DOMElements.upgradeSponsorBotUnlock.style.display = canShowSponsorBot && !gameState.sponsorBot.unlocked ? 'block' : 'none';
    DOMElements.upgradeSponsorBotToggle.style.display = canShowSponsorBot && gameState.sponsorBot.unlocked ? 'block' : 'none';
    if (canShowSponsorBot && !gameState.sponsorBot.unlocked) {
        DOMElements.upgradeSponsorBotUnlockButton.textContent = `Unlock SponsorBot (${formatNumber(gameState.sponsorBot.cost)} EP)`;
        DOMElements.upgradeSponsorBotUnlockButton.disabled = ep < gameState.sponsorBot.cost;
    } else if (canShowSponsorBot) {
        DOMElements.upgradeSponsorBotToggleButton.textContent = `Toggle SponsorBot (${gameState.sponsorBot.active ? 'Active' : 'Paused'})`;
    }
}

function purchaseInteractionUnlock(type) {
    const cost = gameState[`unlock${type}Cost`];
    if (engagementPoints >= cost) {
        engagementPoints -= cost;
        
        if (type === 'Sponsor') {
            gameState.sponsorTweetUnlocked = true;
        } else {
            gameState[`${type.toLowerCase()}Unlocked`] = true;
        }
        
        addNotification(`${type}s Unlocked!`, "unlock");
        if (type === 'Sponsor') updateNathanAutoTweetState();
        updateAllDisplays();
    }
}

function purchaseBotUnlock(botName) {
    const botState = gameState[botName];
    if (engagementPoints >= botState.cost) {
        engagementPoints -= cost;
        botState.unlocked = true;
        addNotification(`${botName.charAt(0).toUpperCase() + botName.slice(1)} Unlocked and Activated!`, "unlock");
        startBot(botName, true);
        updateAllDisplays();
    }
}
const purchaseLikeBotUnlock = () => purchaseBotUnlock('likeBot');
const purchaseRepostBotUnlock = () => purchaseBotUnlock('repostBot');
const purchaseBookmarkBotUnlock = () => purchaseBotUnlock('bookmarkBot');
const purchaseSponsorBotUnlock = () => purchaseBotUnlock('sponsorBot');

// --- BOT LOGIC (FINAL ENCAPSULATED ARCHITECTURE) ---
function startBot(botName, isNew) {
    const botState = gameState[botName];
    botState.active = true;
    
    if (isNew && botState.intervalId === null) {
        const tickRate = 50;
        const progressPerTick = (tickRate / botState.intervalMs) * 100;
        botState.intervalId = setInterval(() => {
            if (!botState.active) return;
            botState.progress += progressPerTick;
            const progressBar = document.getElementById(`${botName}ProgressBar`);
            if (progressBar) progressBar.style.width = `${botState.progress}%`;
            if (botState.progress >= 100) {
                executeBotAction(botName);
                botState.progress = 0;
            }
        }, tickRate);
    }
    if (!isNew) addNotification(`${botName.charAt(0).toUpperCase() + botName.slice(1)} Resumed.`, "system");
    updateAllDisplays();
}

function executeBotAction(botName) {
    const interactionType = botName.replace('Bot', '');
    const buttonSelector = `.${interactionType}-button`;
    const button = DOMElements.tweetFeed.querySelector(`.tweet ${buttonSelector}:not(:disabled)`);

    if (button) {
        let epGained = 0; let completedText = '';
        switch (interactionType) {
            case 'like': epGained = gameState.epPerLike; completedText = '❤️ Liked!'; break;
            case 'repost': epGained = gameState.epPerRepost; completedText = '🔁 Reposted!'; break;
            case 'bookmark': epGained = gameState.epPerBookmark; completedText = '🔖 Bookmarked!'; break;
            case 'sponsor': epGained = gameState.epPerSponsor; completedText = '⭐ Sponsored!'; break;
        }
        engagementPoints += epGained;
        button.innerHTML = completedText;
        button.classList.add('interaction-complete');
        button.disabled = true;

        createClickPopup(`+${epGained} EP`, { target: button });

        if (interactionType === 'like') {
            addNotification("Your Like prompted Nathan to tweet!", "system");
            createAndAppendTweet();
        }
        updateAllDisplays();
    }
}

function toggleBot(botName) {
    const botState = gameState[botName];
    botState.active = !botState.active;
    if (botState.active) {
        botState.progress = 0;
        const progressBar = document.getElementById(`${botName}ProgressBar`);
        if (progressBar) progressBar.style.width = '0%';
        addNotification(`${botName.charAt(0).toUpperCase() + botName.slice(1)} Resumed.`, "system");
    } else {
        addNotification(`${botName.charAt(0).toUpperCase() + botName.slice(1)} Paused.`, "system");
    }
    updateAllDisplays();
}

function restartAllBotIntervals() {
    ['likeBot', 'repostBot', 'bookmarkBot', 'sponsorBot'].forEach(botName => {
        if (gameState[botName].unlocked) startBot(botName, true);
    });
}
const toggleLikeBot = () => toggleBot('likeBot');
const toggleRepostBot = () => toggleBot('repostBot');
const toggleBookmarkBot = () => toggleBot('bookmarkBot');
const toggleSponsorBot = () => toggleBot('sponsorBot');

// --- UI & GAME STATE UPDATE ---
function updateAllDisplays() {
    DOMElements.engagementPointsDisplay.textContent = formatNumber(engagementPoints);
    DOMElements.totalTweetsDisplay.textContent = formatNumber(totalTweets);
    ['likeBot', 'repostBot', 'bookmarkBot', 'sponsorBot'].forEach(botName => {
        const display = DOMElements[`${botName}StatusDisplay`];
        const botState = gameState[botName];
        if (botState.unlocked) {
            display.style.display = 'inline';
            display.textContent = `${botName.charAt(0).toUpperCase() + botName.slice(1)}: ${botState.active ? 'Active' : 'Paused'}`;
        } else {
            display.style.display = 'none';
        }
    });
    
    updateUpgradesDisplay(); 

    const canShowBlockButton = gameState.sponsorBot.unlocked;
    DOMElements.blockNathanButton.style.display = canShowBlockButton ? 'block' : 'none';
    if (canShowBlockButton) {
        DOMElements.blockNathanButton.disabled = engagementPoints < BLOCK_NATHAN_COST;
    }
}

function addNotification(message, type = "info") {
    const li = document.createElement('li');
    li.className = `notification-item notification-${type}`;
    li.textContent = message;
    DOMElements.notificationsList.prepend(li);
    if (DOMElements.notificationsList.children.length > 20) {
        DOMElements.notificationsList.removeChild(DOMElements.notificationsList.lastChild);
    }
}

function formatNumber(num) { return Math.floor(num).toLocaleString(); }

function updateNathanAutoTweetState() {
    if (gameState.sponsorTweetUnlocked && !gameState.nathanIsTweetingAutomatically) {
        gameState.nathanIsTweetingAutomatically = true;
        gameState.nathanTweetIntervalId = setInterval(() => {
            if (gameState.nathanIsTweetingAutomatically) {
                addNotification("Nathan tweeted something on his own.", "system");
                createAndAppendTweet();
            }
        }, gameState.NATHAN_TWEET_INTERVAL_MS);
    }
}

function blockNathan() {
    if (engagementPoints >= BLOCK_NATHAN_COST) {
        saveGame();
        ['likeBot', 'repostBot', 'bookmarkBot', 'sponsorBot', 'nathanTweet'].forEach(key => {
            const intervalId = gameState[key] ? gameState[key].intervalId : gameState[`${key}IntervalId`];
            if (intervalId) clearInterval(intervalId);
        });

        const timeElapsedMs = Date.now() - gameStartTime;
        const hours = String(Math.floor(timeElapsedMs / 3600000)).padStart(2, '0');
        const minutes = String(Math.floor((timeElapsedMs % 3600000) / 60000)).padStart(2, '0');
        const seconds = String(Math.floor((timeElapsedMs % 60000) / 1000)).padStart(2, '0');
        DOMElements.finalTimeDisplay.textContent = `${hours}:${minutes}:${seconds}`;

        DOMElements.gameContainer.style.display = 'none';
        DOMElements.endScreen.style.display = 'flex';
    }
}

function resetGame() {
    if (autoSaveIntervalId) {
        clearInterval(autoSaveIntervalId);
    }
    window.removeEventListener('beforeunload', saveGame);

    localStorage.removeItem('nathansTwitter2Save_v1.5');
    localStorage.removeItem('theme');

    window.location.reload();
}