// [Advanced/Reflection] - PROJECT OVERVIEW AND CONTEXT
//
// CONTEXT: [This is where you explain the core idea. For example: This project is an incremental game that parodies the engagement-driven nature of social media platforms like Twitter/X. The context is meant to be slightly absurd and comedic, focusing on a single, lonely user, "Nathan."]
//
// CHOSEN ACTION: [Explain your chosen action. For example: The fundamental interaction is the "Click." The entire game is built around clicking to gain "Engagement Points" (EP), which are then used to purchase upgrades that automate or enhance the clicking process. This creates a satisfying gameplay loop.]
//
// DESIGN INFLUENCE: [Explain how the context shaped the design. For example: The Twitter context heavily influenced the UI design, including the layout of the feed, the use of terms like "Like" and "Repost," and the inclusion of a dark mode. The core currency, "Engagement Points," is a direct commentary on how social media measures value.]
//

// --- GAME STATE & CONFIGURATION (as global variables, typical for beginner code) ---

// [Beginner] - CORE GAME VARIABLES
// I've used global variables here to hold the main scores and counters for the game.
// This makes them accessible from any function, which is straightforward for a project of this size.
let engagementPoints = 0;
let totalTweets = 0;
let gameStartTime = 0;
let nathanTweets = [];
let autoSaveIntervalId = null; 

// [Beginner] - MECHANIC VALUES
// These variables control the core game balance, like how many points each action gives.
// Keeping them here at the top makes them easy to find and tweak if I want to change the game's difficulty.
let epPerLike = 1;
let epPerRepost = 3;
let epPerBookmark = 5;
let epPerSponsor = 10;

// [Beginner] - UPGRADE FLAGS & COSTS
// These are 'boolean flags' that track what the player has unlocked. They start as 'false'.
// Each unlockable item also has its cost stored in a variable right next to it.
let repostUnlocked = false;
let unlockRepostCost = 50;
let bookmarkUnlocked = false;
let unlockBookmarkCost = 250;
let sponsorTweetUnlocked = false;
let unlockSponsorCost = 1000; 

// [Intermediate] - BOT STATE OBJECTS
// For the bots, I'm using JavaScript objects to group related variables together.
// Each bot has properties for whether it's unlocked, active, its cost, its speed (intervalMs), and its current progress.
// This is more organized than having separate variables for every single property of every bot (e.g., likeBotUnlocked, likeBotActive, etc.).
let likeBot = { unlocked: false, active: false, cost: 25, intervalMs: 3000, intervalId: null, progress: 0 };
let repostBot = { unlocked: false, active: false, cost: 150, intervalMs: 5000, intervalId: null, progress: 0 };
let bookmarkBot = { unlocked: false, active: false, cost: 750, intervalMs: 8000, intervalId: null, progress: 0 };
let sponsorBot = { unlocked: false, active: false, cost: 3000, intervalMs: 12000, intervalId: null, progress: 0 };
    
// [Beginner] - NATHAN'S AUTO-TWEETING STATE
// These variables control the game's feature where Nathan starts tweeting on his own later in the game.
let nathanIsTweetingAutomatically = false;
let nathanTweetIntervalId = null;
const NATHAN_TWEET_INTERVAL_MS = 7000;

// [Beginner] - GAME CONSTANTS
// These are values that don't change during the game. Using 'const' ensures they can't be accidentally overwritten.
const MAX_TWEETS_ON_FEED = 40;
const NATHAN_IMAGE_COUNT = 37;
const IMAGE_TWEET_CHANCE = 0.05;
const BLOCK_NATHAN_COST = 10000;

// --- INITIALIZATION ---

// [Beginner] - DOMCONTENTLOADED
// This is a very important event listener. It makes sure that all the HTML on the page is fully loaded
// before the JavaScript tries to find and interact with any elements. Without this, I would get errors
// because the script might run before the buttons and divs it's looking for exist.
document.addEventListener('DOMContentLoaded', async () => {
    
    // [Intermediate] - ASYNCHRONOUS DATA FETCHING
    // This part of the code loads the tweet text from an external file. I used 'async/await' with the 'fetch' API.
    // This is an asynchronous operation, meaning it doesn't freeze the page while it's loading the file.
    // The 'try...catch' block is for error handling. If the 'NathanTweets.txt' file is missing or can't be loaded,
    // it will log an error to the console and provide some default tweets so the game doesn't crash.
    try {
        const response = await fetch('NathanTweets.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        nathanTweets = text.split('\n').filter(line => line.trim() !== '');
    } catch (e) {
        console.error("Could not load NathanTweets.txt:", e);
        nathanTweets = ["Error: Could not load tweets.", "Nathan is at a loss for words."];
    }
    
    // [Beginner] - EVENT LISTENERS
    // This is where I connect the HTML buttons to my JavaScript functions.
    // I get each button by its ID and then use 'addEventListener' to tell it what function to run when it's clicked.
    // For example, when the button with the ID 'blockNathanButton' is clicked, the 'blockNathan' function is executed.
    document.getElementById('blockNathanButton').addEventListener('click', blockNathan);
    document.getElementById('resetGameButton').addEventListener('click', resetGame);
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    document.getElementById('upgrade-repost-button').addEventListener('click', purchaseRepostUnlock);
    document.getElementById('upgrade-bookmark-button').addEventListener('click', purchaseBookmarkUnlock);
    document.getElementById('upgrade-sponsor-button').addEventListener('click', purchaseSponsorUnlock);

    document.getElementById('upgrade-likebot-unlock-button').addEventListener('click', purchaseLikeBotUnlock);
    document.getElementById('upgrade-repostbot-unlock-button').addEventListener('click', purchaseRepostBotUnlock);
    document.getElementById('upgrade-bookmarkbot-unlock-button').addEventListener('click', purchaseBookmarkBotUnlock);
    document.getElementById('upgrade-sponsorbot-unlock-button').addEventListener('click', purchaseSponsorBotUnlock);

    document.getElementById('upgrade-likebot-toggle-button').addEventListener('click', toggleLikeBot);
    document.getElementById('upgrade-repostbot-toggle-button').addEventListener('click', toggleRepostBot);
    document.getElementById('upgrade-bookmarkbot-toggle-button').addEventListener('click', toggleBookmarkBot);
    document.getElementById('upgrade-sponsorbot-toggle-button').addEventListener('click', toggleSponsorBot);
    
    // [Intermediate] - MOBILE VIEW LOGIC
    // This code handles the tab-based navigation on smaller screens.
    // It adds a class to the main layout container, and the CSS uses that class to show/hide the correct column (Timeline or Upgrades).
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

    // [Beginner] - MODAL LOGIC
    // This handles the pop-up welcome message for new players.
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeModalCloseButton = document.getElementById('welcomeModalCloseButton');

    welcomeModalCloseButton.addEventListener('click', () => {
        welcomeModal.style.display = 'none';
        localStorage.setItem('nathansTwitterWelcome_v1', 'true');
    });

    // [Beginner] - GAME START
    // These functions run once the page is ready to start the game.
    loadGame();

    if (!localStorage.getItem('nathansTwitterWelcome_v1')) {
        welcomeModal.style.display = 'flex';
    }
    
    if (!document.getElementById('tweetFeed').querySelector('.tweet')) {
        createAndAppendTweet();
    }
    
    setMobileView('timeline');
});

// [Beginner] - DARK MODE TOGGLE
// This function switches between light and dark mode. It works by adding or removing the 'dark-mode' class
// from the main `<html>` element. The CSS file has specific rules for when this class is present.
// It also saves the user's preference in localStorage so it's remembered the next time they visit.
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    document.getElementById('sun-icon').style.display = isDarkMode ? 'none' : 'block';
    document.getElementById('moon-icon').style.display = isDarkMode ? 'block' : 'none';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// [Intermediate] - SAVE/LOAD SYSTEM
// These functions handle saving and loading the player's progress.
// DESIGN CHOICE: I chose localStorage because it's a simple, browser-based way to store data without needing a server.
// It stores data as key-value pairs of strings.
function saveGame() {
    try {
        // I gather all the global game variables into a single 'stateToSave' object.
        let stateToSave = {
            engagementPoints, totalTweets, gameStartTime,
            repostUnlocked, bookmarkUnlocked, sponsorTweetUnlocked,
            likeBot, repostBot, bookmarkBot, sponsorBot,
            nathanIsTweetingAutomatically
        };
        // Because localStorage can only store strings, I use JSON.stringify to convert the object into a JSON string.
        // I also have to handle the interval IDs, which can't be saved. This 'cleanSave' step removes them before saving.
        let cleanSave = JSON.parse(JSON.stringify(stateToSave));
        cleanSave.likeBot.intervalId = null;
        cleanSave.repostBot.intervalId = null;
        cleanSave.bookmarkBot.intervalId = null;
        cleanSave.sponsorBot.intervalId = null;
        
        localStorage.setItem('nathansTwitter2Save_v1.5', JSON.stringify(cleanSave));
    } catch (e) { console.error("Save failed:", e); }
}

function loadGame() {
    // It checks if a save file exists in localStorage.
    const saved = localStorage.getItem('nathansTwitter2Save_v1.5');
    if (saved) {
        try {
            // If a save exists, it uses JSON.parse to turn the saved string back into a JavaScript object.
            const parsed = JSON.parse(saved);
            // It then updates all the global variables with the loaded values.
            engagementPoints = parsed.engagementPoints || 0;
            totalTweets = parsed.totalTweets || 0;
            gameStartTime = parsed.gameStartTime || Date.now();
            repostUnlocked = parsed.repostUnlocked || false;
            bookmarkUnlocked = parsed.bookmarkUnlocked || false;
            sponsorTweetUnlocked = parsed.sponsorTweetUnlocked || false;
            nathanIsTweetingAutomatically = parsed.nathanIsTweetingAutomatically || false;
            
            likeBot = { ...likeBot, ...parsed.likeBot };
            repostBot = { ...repostBot, ...parsed.repostBot };
            bookmarkBot = { ...bookmarkBot, ...parsed.bookmarkBot };
            sponsorBot = { ...sponsorBot, ...parsed.sponsorBot };

        } catch(e) {
            console.error("Failed to parse save data, starting new game.", e);
            initializeNewGame();
        }
    } else {
        // If there's no save file, it calls a function to set up a fresh game.
        initializeNewGame();
    }
    
    // After loading, it updates all the visual elements on the page to match the loaded state.
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    document.getElementById('sun-icon').style.display = isDarkMode ? 'none' : 'block';
    document.getElementById('moon-icon').style.display = isDarkMode ? 'block' : 'none';

    restartAllBotIntervals();
    updateNathanAutoTweetState();
    updateAllDisplays();

    // It also sets up the auto-save timer.
    window.addEventListener('beforeunload', saveGame);
    if (!autoSaveIntervalId) {
        autoSaveIntervalId = setInterval(saveGame, 15000);
    }
}

// [Beginner] - NEW GAME INITIALIZER
// This function just resets all the game variables to their starting values.
// It's called when a player starts for the first time or if their save data is corrupted.
function initializeNewGame() {
    engagementPoints = 0;
    totalTweets = 0;
    gameStartTime = Date.now();
    repostUnlocked = false;
    bookmarkUnlocked = false;
    sponsorTweetUnlocked = false;
    nathanIsTweetingAutomatically = false;
    likeBot = { unlocked: false, active: false, cost: 25, intervalMs: 3000, intervalId: null, progress: 0 };
    repostBot = { unlocked: false, active: false, cost: 150, intervalMs: 5000, intervalId: null, progress: 0 };
    bookmarkBot = { unlocked: false, active: false, cost: 750, intervalMs: 8000, intervalId: null, progress: 0 };
    sponsorBot = { unlocked: false, active: false, cost: 3000, intervalMs: 12000, intervalId: null, progress: 0 };
}

// [Intermediate] - AFFECTIVE FEEDBACK
// This function creates the floating "+1 EP" text that appears when you click.
// DESIGN CHOICE: This is a key piece of user feedback. It makes the 'Click' action feel satisfying and rewarding.
// It works by creating a new `<div>` element, positioning it where the click happened, and then using a CSS animation
// to make it float up and fade out. This immediate visual reward is a core principle of engaging game design.
function createClickPopup(text, options) {
    const popup = document.createElement('div');
    popup.innerHTML = text; popup.className = 'click-popup';
    document.body.appendChild(popup);
    const rect = options.target.getBoundingClientRect();
    popup.style.left = `${rect.left + (rect.width / 2) - (popup.offsetWidth / 2)}px`;
    popup.style.top = `${rect.top - popup.offsetHeight}px`;
    setTimeout(() => popup.remove(), 1100);
}

// [Beginner] - HANDLING INTERACTIONS
// This function is called whenever a player clicks an interaction button (Like, Repost, etc.).
// It determines which button was clicked, adds the correct number of points, disables the button, and updates the display.
function handleInteraction(buttonElement, interactionType) {
    let epGained = 0;
    let completedText = '';

    if (interactionType === 'Like') {
        epGained = epPerLike;
        completedText = '❤️ Liked!';
    } else if (interactionType === 'Repost') {
        epGained = epPerRepost;
        completedText = '🔁 Reposted!';
    } else if (interactionType === 'Bookmark') {
        epGained = epPerBookmark;
        completedText = '🔖 Bookmarked!';
    } else if (interactionType === 'Sponsor') {
        epGained = epPerSponsor;
        completedText = '⭐ Sponsored!';
    }

    engagementPoints += epGained;
    buttonElement.innerHTML = completedText;
    buttonElement.classList.add('interaction-complete');
    buttonElement.disabled = true;
    createClickPopup(`+${epGained} EP`, { target: buttonElement });

    // The 'Like' action is special because it's the primary way the player manually generates new content.
    if (interactionType === 'Like') {
        addNotification("Your Like prompted Nathan to tweet!", "system");
        createAndAppendTweet();
    }
    updateAllDisplays();
}

// [Intermediate] - DYNAMIC CONTENT CREATION (DOM MANIPULATION)
// This function builds a new tweet HTML structure entirely within JavaScript.
// It uses `document.createElement` to create each `<div>`, `<p>`, `<img>`, etc., sets their classes and content,
// and then uses `appendChild` to piece them together like building blocks.
// DESIGN CHOICE: This is necessary because the tweets are generated dynamically during gameplay. Instead of having static HTML,
// this function allows for an infinite feed of content. It also removes old tweets to keep the page from getting too slow.
function createAndAppendTweet() {
    const tweetFeed = document.getElementById('tweetFeed');
    const noTweetsMessage = tweetFeed.querySelector('.no-tweets-message');
    if (noTweetsMessage) {
        noTweetsMessage.remove();
    }

    totalTweets++;
    const tweetDiv = document.createElement('div');
    tweetDiv.classList.add('tweet');
    
    // ... building all the inner elements ...
    const avatarContainer = document.createElement('div');
    avatarContainer.classList.add('tweet-avatar-container');
    const authorImg = document.createElement('img');
    authorImg.src = "images/NathanImage7.png";
    authorImg.alt = "Nathan Henry";
    authorImg.classList.add('tweet-author-img');
    avatarContainer.appendChild(authorImg);
    
    const mainContentDiv = document.createElement('div');
    mainContentDiv.classList.add('tweet-main-content');
    
    const tweetHeader = document.createElement('div');
    tweetHeader.classList.add('tweet-header');
    
    const authorDetailsDiv = document.createElement('div');
    authorDetailsDiv.classList.add('tweet-author-details');
    const authorName = document.createElement('span');
    authorName.classList.add('tweet-author-name');
    authorName.textContent = "Nathan Henry";
    const authorHandle = document.createElement('span');
    authorHandle.classList.add('tweet-author-handle');
    authorHandle.textContent = "@Nathan9154438";
    authorDetailsDiv.appendChild(authorName);
    authorDetailsDiv.appendChild(authorHandle);
    
    const timestamp = document.createElement('span');
    timestamp.classList.add('tweet-timestamp');
    timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    tweetHeader.appendChild(authorDetailsDiv);
    tweetHeader.appendChild(timestamp);
    
    const tweetData = generateNathanTweetData();
    const contentP = document.createElement('p');
    contentP.classList.add('tweet-content');
    contentP.textContent = tweetData.text;
    
    mainContentDiv.appendChild(tweetHeader);
    mainContentDiv.appendChild(contentP);
    
    if (tweetData.image) {
        const ic = document.createElement('div');
        ic.classList.add('tweet-image-container');
        const ie = document.createElement('img');
        ie.src = tweetData.image;
        ie.alt = "Nathan's Image";
        ie.classList.add('tweet-image');
        ic.appendChild(ie);
        mainContentDiv.appendChild(ic);
    }
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('interaction-buttons-container');
    
    const likeButton = document.createElement('button');
    likeButton.classList.add('like-button');
    likeButton.textContent = 'Like';
    likeButton.addEventListener('click', function() { handleInteraction(this, 'Like'); });
    buttonsContainer.appendChild(likeButton);
    
    if (repostUnlocked) {
        const rb = document.createElement('button');
        rb.classList.add('repost-button');
        rb.textContent = 'Repost';
        rb.addEventListener('click', function() { handleInteraction(this, 'Repost'); });
        buttonsContainer.appendChild(rb);
    }
    if (bookmarkUnlocked) {
        const bb = document.createElement('button');
        bb.classList.add('bookmark-button');
        bb.textContent = 'Bookmark';
        bb.addEventListener('click', function() { handleInteraction(this, 'Bookmark'); });
        buttonsContainer.appendChild(bb);
    }
    if (sponsorTweetUnlocked) {
        const sb = document.createElement('button');
        sb.classList.add('sponsor-button');
        sb.textContent = 'Sponsor';
        sb.addEventListener('click', function() { handleInteraction(this, 'Sponsor'); });
        buttonsContainer.appendChild(sb);
    }
    
    mainContentDiv.appendChild(buttonsContainer);
    
    tweetDiv.appendChild(avatarContainer);
    tweetDiv.appendChild(mainContentDiv);
    
    tweetFeed.prepend(tweetDiv);
    
    while (tweetFeed.childElementCount > MAX_TWEETS_ON_FEED) {
        tweetFeed.removeChild(tweetFeed.lastChild);
    }
    
    updateAllDisplays();
}

function generateNathanTweetData() {
    if (nathanTweets.length === 0) {
        return { text: "Nathan is thinking...", image: null };
    }
    const text = nathanTweets[Math.floor(Math.random() * nathanTweets.length)];
    let image = null;
    if (Math.random() < IMAGE_TWEET_CHANCE && NATHAN_IMAGE_COUNT > 0) {
        image = `images/NathanImage${Math.floor(Math.random() * NATHAN_IMAGE_COUNT) + 1}.png`;
    }
    return { text, image };
}

// [Beginner] - UPGRADE PURCHASE FUNCTIONS
// I created a separate function for each unlock. This approach is very direct.
// Each function checks if the player has enough points, and if so, it subtracts the cost and sets the unlock flag to true.
// This is an example of "WET" (Write Everything Twice) code, but it's simple to understand for each specific case.
function purchaseRepostUnlock() {
    if (engagementPoints >= unlockRepostCost) {
        engagementPoints -= unlockRepostCost;
        repostUnlocked = true;
        addNotification(`Reposts Unlocked!`, "unlock");
        updateAllDisplays();
    }
}
function purchaseBookmarkUnlock() {
    if (engagementPoints >= unlockBookmarkCost) {
        engagementPoints -= unlockBookmarkCost;
        bookmarkUnlocked = true;
        addNotification(`Bookmarks Unlocked!`, "unlock");
        updateAllDisplays();
    }
}
function purchaseSponsorUnlock() {
    if (engagementPoints >= unlockSponsorCost) {
        engagementPoints -= unlockSponsorCost;
        sponsorTweetUnlocked = true;
        addNotification(`Sponsors Unlocked!`, "unlock");
        updateNathanAutoTweetState();
        updateAllDisplays();
    }
}

function purchaseLikeBotUnlock() {
    if (engagementPoints >= likeBot.cost) {
        engagementPoints -= likeBot.cost;
        likeBot.unlocked = true;
        addNotification(`LikeBot Unlocked and Activated!`, "unlock");
        startBot('likeBot');
        updateAllDisplays();
    }
}
function purchaseRepostBotUnlock() {
    if (engagementPoints >= repostBot.cost) {
        engagementPoints -= repostBot.cost;
        repostBot.unlocked = true;
        addNotification(`RepostBot Unlocked and Activated!`, "unlock");
        startBot('repostBot');
        updateAllDisplays();
    }
}
function purchaseBookmarkBotUnlock() {
    if (engagementPoints >= bookmarkBot.cost) {
        engagementPoints -= bookmarkBot.cost;
        bookmarkBot.unlocked = true;
        addNotification(`BookmarkBot Unlocked and Activated!`, "unlock");
        startBot('bookmarkBot');
        updateAllDisplays();
    }
}
function purchaseSponsorBotUnlock() {
    if (engagementPoints >= sponsorBot.cost) {
        engagementPoints -= sponsorBot.cost;
        sponsorBot.unlocked = true;
        addNotification(`SponsorBot Unlocked and Activated!`, "unlock");
        startBot('sponsorBot');
        updateAllDisplays();
    }
}

// [Intermediate] - AUTOMATION LOGIC (BOTS)
// This function uses `setInterval` to create the game's automation. `setInterval` is a JavaScript function
// that repeatedly calls a function after a specified delay.
// Here, it's used to increment a bot's progress bar. When the progress reaches 100%, it executes the bot's action
// (like clicking a button for the player) and resets the progress. This is the core of the "idle" or "incremental" game genre.
function startBot(botName) {
    let botState;
    if (botName === 'likeBot') botState = likeBot;
    else if (botName === 'repostBot') botState = repostBot;
    else if (botName === 'bookmarkBot') botState = bookmarkBot;
    else if (botName === 'sponsorBot') botState = sponsorBot;

    if (!botState) return;

    botState.active = true;
    
    if (botState.intervalId) {
        clearInterval(botState.intervalId);
    }

    const tickRate = 50;
    const progressPerTick = (tickRate / botState.intervalMs) * 100;

    botState.intervalId = setInterval(() => {
        if (!botState.active) return;
        
        botState.progress += progressPerTick;
        const progressBar = document.getElementById(`${botName}ProgressBar`);
        if (progressBar) {
            progressBar.style.width = `${botState.progress}%`;
        }

        if (botState.progress >= 100) {
            executeBotAction(botName);
            botState.progress = 0;
        }
    }, tickRate);
    
    updateAllDisplays();
}

function executeBotAction(botName) {
    const interactionType = botName.replace('Bot', '');
    const buttonSelector = `.${interactionType}-button`;
    // The bot needs to find a button on the page that it can actually click.
    const button = document.getElementById('tweetFeed').querySelector(`.tweet ${buttonSelector}:not(:disabled)`);

    if (button) {
        let epGained = 0;
        let completedText = '';
        
        if (interactionType === 'like') {
            epGained = epPerLike; completedText = '❤️ Liked!';
            addNotification("LikeBot automatically liked a post, prompting a new tweet.", "system");
            createAndAppendTweet();
        } else if (interactionType === 'repost') {
            epGained = epPerRepost; completedText = '🔁 Reposted!';
        } else if (interactionType === 'bookmark') {
            epGained = epPerBookmark; completedText = '🔖 Bookmarked!';
        } else if (interactionType === 'sponsor') {
            epGained = epPerSponsor; completedText = '⭐ Sponsored!';
        }
        
        engagementPoints += epGained;
        button.innerHTML = completedText;
        button.classList.add('interaction-complete');
        button.disabled = true;

        createClickPopup(`+${epGained} EP`, { target: button });
        updateAllDisplays();
    }
}

// [Beginner] - BOT TOGGLE FUNCTIONS
// More duplicated functions, one for each bot toggle button.
// They simply flip the 'active' boolean on the bot's state object and update the UI.
function toggleLikeBot() {
    likeBot.active = !likeBot.active;
    if (likeBot.active) {
        likeBot.progress = 0;
        document.getElementById('likeBotProgressBar').style.width = '0%';
        addNotification(`LikeBot Resumed.`, "system");
    } else {
        addNotification(`LikeBot Paused.`, "system");
    }
    updateAllDisplays();
}
function toggleRepostBot() {
    repostBot.active = !repostBot.active;
    if (repostBot.active) {
        repostBot.progress = 0;
        document.getElementById('repostBotProgressBar').style.width = '0%';
        addNotification(`RepostBot Resumed.`, "system");
    } else {
        addNotification(`RepostBot Paused.`, "system");
    }
    updateAllDisplays();
}
function toggleBookmarkBot() {
    bookmarkBot.active = !bookmarkBot.active;
    if (bookmarkBot.active) {
        bookmarkBot.progress = 0;
        document.getElementById('bookmarkBotProgressBar').style.width = '0%';
        addNotification(`BookmarkBot Resumed.`, "system");
    } else {
        addNotification(`BookmarkBot Paused.`, "system");
    }
    updateAllDisplays();
}
function toggleSponsorBot() {
    sponsorBot.active = !sponsorBot.active;
    if (sponsorBot.active) {
        sponsorBot.progress = 0;
        document.getElementById('sponsorBotProgressBar').style.width = '0%';
        addNotification(`SponsorBot Resumed.`, "system");
    } else {
        addNotification(`SponsorBot Paused.`, "system");
    }
    updateAllDisplays();
}

function restartAllBotIntervals() {
    if (likeBot.unlocked) {
        startBot('likeBot');
        if (!likeBot.active) addNotification(`LikeBot is Paused.`, "system");
    }
    if (repostBot.unlocked) {
        startBot('repostBot');
        if (!repostBot.active) addNotification(`RepostBot is Paused.`, "system");
    }
    if (bookmarkBot.unlocked) {
        startBot('bookmarkBot');
        if (!bookmarkBot.active) addNotification(`BookmarkBot is Paused.`, "system");
    }
    if (sponsorBot.unlocked) {
        startBot('sponsorBot');
        if (!sponsorBot.active) addNotification(`SponsorBot is Paused.`, "system");
    }
}

// [Intermediate] - UI UPDATE FUNCTIONS
// This is the "render" part of the game. These functions are responsible for making sure the visual
// elements on the page match the current state of the game stored in the JavaScript variables.
// They are called after any action that changes the game state (e.g., gaining points, buying an upgrade).
function updateAllDisplays() {
    // This uses `document.getElementById` to find elements and update their text content.
    document.getElementById('engagementPointsDisplay').textContent = formatNumber(engagementPoints);
    document.getElementById('totalTweetsDisplay').textContent = formatNumber(totalTweets);
    
    // This section updates the status text for each bot in the header.
    document.getElementById('likeBotStatusDisplay').style.display = likeBot.unlocked ? 'inline' : 'none';
    if(likeBot.unlocked) document.getElementById('likeBotStatusDisplay').textContent = `LikeBot: ${likeBot.active ? 'Active' : 'Paused'}`;
    
    document.getElementById('repostBotStatusDisplay').style.display = repostBot.unlocked ? 'inline' : 'none';
    if(repostBot.unlocked) document.getElementById('repostBotStatusDisplay').textContent = `RepostBot: ${repostBot.active ? 'Active' : 'Paused'}`;
    
    document.getElementById('bookmarkBotStatusDisplay').style.display = bookmarkBot.unlocked ? 'inline' : 'none';
    if(bookmarkBot.unlocked) document.getElementById('bookmarkBotStatusDisplay').textContent = `BookmarkBot: ${bookmarkBot.active ? 'Active' : 'Paused'}`;
    
    document.getElementById('sponsorBotStatusDisplay').style.display = sponsorBot.unlocked ? 'inline' : 'none';
    if(sponsorBot.unlocked) document.getElementById('sponsorBotStatusDisplay').textContent = `SponsorBot: ${sponsorBot.active ? 'Active' : 'Paused'}`;
    
    updateUpgradesDisplay(); 

    const blockButton = document.getElementById('blockNathanButton');
    if (sponsorBot.unlocked) {
        blockButton.style.display = 'block';
        blockButton.disabled = engagementPoints < BLOCK_NATHAN_COST;
    } else {
        blockButton.style.display = 'none';
    }
}

function updateUpgradesDisplay() {
    const ep = engagementPoints;

    // This section handles the logic for the upgrades list. It shows or hides upgrades based on what
    // the player has already unlocked. It also enables or disables the purchase buttons based on
    // whether the player can afford the upgrade. This creates a sense of progression for the user.
    document.getElementById('upgrade-repost').style.display = !repostUnlocked ? 'block' : 'none';
    if (!repostUnlocked) {
        document.getElementById('upgrade-repost-button').textContent = `Unlock Reposts (${formatNumber(unlockRepostCost)} EP)`;
        document.getElementById('upgrade-repost-button').disabled = ep < unlockRepostCost;
    }

    const canShowBookmark = repostUnlocked && !bookmarkUnlocked;
    document.getElementById('upgrade-bookmark').style.display = canShowBookmark ? 'block' : 'none';
    if (canShowBookmark) {
        document.getElementById('upgrade-bookmark-button').textContent = `Unlock Bookmarks (${formatNumber(unlockBookmarkCost)} EP)`;
        document.getElementById('upgrade-bookmark-button').disabled = ep < unlockBookmarkCost;
    }

    const canShowSponsor = bookmarkUnlocked && !sponsorTweetUnlocked;
    document.getElementById('upgrade-sponsor').style.display = canShowSponsor ? 'block' : 'none';
    if (canShowSponsor) {
        document.getElementById('upgrade-sponsor-button').textContent = `Unlock Sponsors (${formatNumber(unlockSponsorCost)} EP)`;
        document.getElementById('upgrade-sponsor-button').disabled = ep < unlockSponsorCost;
    }

    document.getElementById('upgrade-likebot-unlock').style.display = !likeBot.unlocked ? 'block' : 'none';
    document.getElementById('upgrade-likebot-toggle').style.display = likeBot.unlocked ? 'block' : 'none';
    if (!likeBot.unlocked) {
        document.getElementById('upgrade-likebot-unlock-button').textContent = `Unlock LikeBot (${formatNumber(likeBot.cost)} EP)`;
        document.getElementById('upgrade-likebot-unlock-button').disabled = ep < likeBot.cost;
    } else {
        document.getElementById('upgrade-likebot-toggle-button').textContent = `Toggle LikeBot (${likeBot.active ? 'Active' : 'Paused'})`;
    }

    const canShowRepostBot = repostUnlocked;
    document.getElementById('upgrade-repostbot-unlock').style.display = canShowRepostBot && !repostBot.unlocked ? 'block' : 'none';
    document.getElementById('upgrade-repostbot-toggle').style.display = canShowRepostBot && repostBot.unlocked ? 'block' : 'none';
    if (canShowRepostBot && !repostBot.unlocked) {
        document.getElementById('upgrade-repostbot-unlock-button').textContent = `Unlock RepostBot (${formatNumber(repostBot.cost)} EP)`;
        document.getElementById('upgrade-repostbot-unlock-button').disabled = ep < repostBot.cost;
    } else if (canShowRepostBot) {
        document.getElementById('upgrade-repostbot-toggle-button').textContent = `Toggle RepostBot (${repostBot.active ? 'Active' : 'Paused'})`;
    }

    const canShowBookmarkBot = bookmarkUnlocked;
    document.getElementById('upgrade-bookmarkbot-unlock').style.display = canShowBookmarkBot && !bookmarkBot.unlocked ? 'block' : 'none';
    document.getElementById('upgrade-bookmarkbot-toggle').style.display = canShowBookmarkBot && bookmarkBot.unlocked ? 'block' : 'none';
    if (canShowBookmarkBot && !bookmarkBot.unlocked) {
        document.getElementById('upgrade-bookmarkbot-unlock-button').textContent = `Unlock BookmarkBot (${formatNumber(bookmarkBot.cost)} EP)`;
        document.getElementById('upgrade-bookmarkbot-unlock-button').disabled = ep < bookmarkBot.cost;
    } else if (canShowBookmarkBot) {
        document.getElementById('upgrade-bookmarkbot-toggle-button').textContent = `Toggle BookmarkBot (${bookmarkBot.active ? 'Active' : 'Paused'})`;
    }
    
    const canShowSponsorBot = sponsorTweetUnlocked;
    document.getElementById('upgrade-sponsorbot-unlock').style.display = canShowSponsorBot && !sponsorBot.unlocked ? 'block' : 'none';
    document.getElementById('upgrade-sponsorbot-toggle').style.display = canShowSponsorBot && sponsorBot.unlocked ? 'block' : 'none';
    if (canShowSponsorBot && !sponsorBot.unlocked) {
        document.getElementById('upgrade-sponsorbot-unlock-button').textContent = `Unlock SponsorBot (${formatNumber(sponsorBot.cost)} EP)`;
        document.getElementById('upgrade-sponsorbot-unlock-button').disabled = ep < sponsorBot.cost;
    } else if (canShowSponsorBot) {
        document.getElementById('upgrade-sponsorbot-toggle-button').textContent = `Toggle SponsorBot (${sponsorBot.active ? 'Active' : 'Paused'})`;
    }
}


function addNotification(message, type = "info") {
    const li = document.createElement('li');
    li.className = `notification-item notification-${type}`;
    li.textContent = message;
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.prepend(li);
    if (notificationsList.children.length > 20) {
        notificationsList.removeChild(notificationsList.lastChild);
    }
}

function formatNumber(num) {
    return Math.floor(num).toLocaleString();
}

function updateNathanAutoTweetState() {
    if (sponsorTweetUnlocked && !nathanIsTweetingAutomatically) {
        nathanIsTweetingAutomatically = true;
        nathanTweetIntervalId = setInterval(() => {
            if (nathanIsTweetingAutomatically) {
                addNotification("Nathan tweeted something on his own.", "system");
                createAndAppendTweet();
            }
        }, NATHAN_TWEET_INTERVAL_MS);
    }
}

function blockNathan() {
    if (engagementPoints >= BLOCK_NATHAN_COST) {
        saveGame();
        // Clear all intervals to stop the game
        if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
        if (likeBot.intervalId) clearInterval(likeBot.intervalId);
        if (repostBot.intervalId) clearInterval(repostBot.intervalId);
        if (bookmarkBot.intervalId) clearInterval(bookmarkBot.intervalId);
        if (sponsorBot.intervalId) clearInterval(sponsorBot.intervalId);
        if (nathanTweetIntervalId) clearInterval(nathanTweetIntervalId);

        const timeElapsedMs = Date.now() - gameStartTime;
        const hours = String(Math.floor(timeElapsedMs / 3600000)).padStart(2, '0');
        const minutes = String(Math.floor((timeElapsedMs % 3600000) / 60000)).padStart(2, '0');
        const seconds = String(Math.floor((timeElapsedMs % 60000) / 1000)).padStart(2, '0');
        document.getElementById('finalTimeDisplay').textContent = `${hours}:${minutes}:${seconds}`;

        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('endScreen').style.display = 'flex';
    }
}

function resetGame() {
    // Clear any timers and remove event listeners to prevent memory leaks
    if (autoSaveIntervalId) {
        clearInterval(autoSaveIntervalId);
        autoSaveIntervalId = null;
    }
    window.removeEventListener('beforeunload', saveGame);

    // Clear the data from localStorage
    localStorage.removeItem('nathansTwitter2Save_v1.5');
    localStorage.removeItem('theme');

    // Reload the page to start fresh
    window.location.reload();
}


// [Advanced/Reflection] - CHALLENGES & FUTURE IMPROVEMENTS
//
// CHALLENGES: [Describe a challenge you faced. For example: A key challenge was managing all the different timers (setIntervals) for the bots and the auto-save. When loading a game or ending it, I had to be careful to clear all existing intervals to prevent them from running in the background and causing bugs or performance issues. Another challenge was structuring the save/load system to correctly handle all the separate global variables.]
//
// FUTURE IMPROVEMENTS: [Describe how this could be expanded. For example: This prototype could be expanded into a more complex game. I could add more upgrade tiers, or different types of "posts" that give different rewards. The JavaScript structure, while simple, is modular enough that adding a new 'CommentBot' would be straightforward by copying the pattern of the existing bots. The main limitation is that the extensive use of global variables would become hard to manage in a much larger project, and I would likely move to a more structured state management pattern if I were to continue development.]
//
// MEDIA ATTRIBUTION: [List where your non-code assets came from. For example: The Twitter logo is used for the purpose of parody. The avatar images and tweet content were generated/created by [Your Name/Source]. All other code was written by me.]
//