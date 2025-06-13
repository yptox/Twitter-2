
// --- Game State ---

// These are the main scores and counters for the game. I made them global variables so that any function in the script can access them easily.
let engagementPoints = 0;
let totalTweets = 0;
let gameStartTime = 0;
let nathanTweets = [];
let autoSaveIntervalId = null; 

// These variables control the core game balance, like how many points each action gives. theyre easily editable to change how the game feels.
let epPerLike = 1;
let epPerRepost = 3;
let epPerBookmark = 5;
let epPerSponsor = 10;

// These are boolean flags that track what the player has unlocked. They start as false.
// Each unlockable item also has its cost stored in a variable right next to it.
let repostUnlocked = false;
let unlockRepostCost = 50;
let bookmarkUnlocked = false;
let unlockBookmarkCost = 250;
let sponsorTweetUnlocked = false;
let unlockSponsorCost = 1000; 

// For the bots, I'm using JavaScript objects to group related variables together. Each bot has properties for whether it's unlocked, active, its cost, its speed, and its current progress.
let likeBot = { unlocked: false, active: false, cost: 25, intervalMs: 3000, intervalId: null, progress: 0 };
let repostBot = { unlocked: false, active: false, cost: 150, intervalMs: 5000, intervalId: null, progress: 0 };
let bookmarkBot = { unlocked: false, active: false, cost: 750, intervalMs: 8000, intervalId: null, progress: 0 };
let sponsorBot = { unlocked: false, active: false, cost: 3000, intervalMs: 12000, intervalId: null, progress: 0 };
    
// These variables control the game's feature where Nathan starts tweeting on his own later in the game. This feature exists to make the player feel completely overwhelmed by the amount of garbage being spewed at them.
let nathanIsTweetingAutomatically = false;
let nathanTweetIntervalId = null;
const NATHAN_TWEET_INTERVAL_MS = 7000;

const MAX_TWEETS_ON_FEED = 40;
const NATHAN_IMAGE_COUNT = 37;
const IMAGE_TWEET_CHANCE = 0.05;
const BLOCK_NATHAN_COST = 10000;

// --- Game Initialisation ---

// using domcontentloaded to ensure html is fully loaded before the script runs
document.addEventListener('DOMContentLoaded', async () => {
        
    // This loads the tweet text from an external file. At first I had all the tweets just inside the js file but it just felt wrong so I learnt how to fetch them from a txt file.
    // The "try catch" block is for error handling. If the "NathanTweets.txt" file is missing or can't be loaded itll log an error to the console and provide a placeholder tweet.
    try {
        const response = await fetch('NathanTweets.txt');
        if (!response.ok) {
            throw new Error(`http error: ${response.status}`);
        }
        const text = await response.text();
        nathanTweets = text.split('\n').filter(line => line.trim() !== '');
    } catch (e) {
        console.error("Could not load NathanTweets.txt:", e);
        nathanTweets = ["Could not load tweets"];
    }
    
    // This is where the buttons in the html connect to the functions in the script.
    // using "addEventListener" to tell each button what function to run when its clicked.


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
    

    // This code handles the tab navigation on mobile.
    // It adds a class to the main layout container used by css to show the appropriate column (timeline or upgrades)
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

    // This handles the pop-up welcome message for new players.
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeModalCloseButton = document.getElementById('welcomeModalCloseButton');

    welcomeModalCloseButton.addEventListener('click', () => {
        welcomeModal.style.display = 'none';
        localStorage.setItem('nathansTwitterWelcome_v1', 'true');
    });


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


// this is the dark mode toggle code. it adds or removes the "dark-mode" class from the main html element.
// It also saves the user's preference in localStorage so it's remembered the next time they visit.
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    document.getElementById('sun-icon').style.display = isDarkMode ? 'none' : 'block';
    document.getElementById('moon-icon').style.display = isDarkMode ? 'block' : 'none';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}


// using localStorage to save and load progress. it stores data as key-value pairs of strings.
function saveGame() {
    try {
        // gather all the global game variables into a single object
        let stateToSave = {
            engagementPoints, totalTweets, gameStartTime,
            repostUnlocked, bookmarkUnlocked, sponsorTweetUnlocked,
            likeBot, repostBot, bookmarkBot, sponsorBot,
            nathanIsTweetingAutomatically
        };
        // have to use JSON.stringify to convert the object into a JSON string.
        // this step removes the intervalIds before saving
        let cleanSave = JSON.parse(JSON.stringify(stateToSave));
        cleanSave.likeBot.intervalId = null;
        cleanSave.repostBot.intervalId = null;
        cleanSave.bookmarkBot.intervalId = null;
        cleanSave.sponsorBot.intervalId = null;
        
        localStorage.setItem('nathansTwitter2Save_v1.5', JSON.stringify(cleanSave));
    } catch (e) { console.error("Save failed:", e); }
}

function loadGame() {
    // check if a save file exists in localStorage
    const saved = localStorage.getItem('nathansTwitter2Save_v1.5');
    if (saved) {
        try {
            // if a save exists, use JSON.parse to turn the saved string back into a JavaScript object.
            const parsed = JSON.parse(saved);
            // updates all the global variables with the loaded values.
            engagementPoints = parsed.engagementPoints || 0;
            totalTweets = parsed.totalTweets || 0;
            gameStartTime = parsed.gameStartTime || Date.now();
            repostUnlocked = parsed.repostUnlocked || false;
            bookmarkUnlocked = parsed.bookmarkUnlocked || false;
            sponsorTweetUnlocked = parsed.sponsorTweetUnlocked || false;
            nathanIsTweetingAutomatically = parsed.nathanIsTweetingAutomatically || false;
            
            // loading bots by taking the saved bot info from "parsed" and updating the existing bot objects with it so I don't lose anything that wasn't saved.
            Object.assign(likeBot, parsed.likeBot);
            Object.assign(repostBot, parsed.repostBot);
            Object.assign(bookmarkBot, parsed.bookmarkBot);
            Object.assign(sponsorBot, parsed.sponsorBot);

        } catch(e) {
            console.error("Failed to parse save data, starting new game.", e);
            initializeNewGame();
        }
    } else {
        // If there's no save file, it calls a function to start a new game.
        initializeNewGame();
    }
    
    // After loading update all the elements on the page to match the loaded state. (light v dark)
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    document.getElementById('sun-icon').style.display = isDarkMode ? 'none' : 'block';
    document.getElementById('moon-icon').style.display = isDarkMode ? 'block' : 'none';

    restartAllBotIntervals();
    updateNathanAutoTweetState();
    updateAllDisplays();

    // Setting up the auto-save timer.
    window.addEventListener('beforeunload', saveGame);
    if (!autoSaveIntervalId) {
        autoSaveIntervalId = setInterval(saveGame, 15000);
    }
}

// This function sets all the game variables to their starting values. It's called when a player starts for the first time.
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

// This function creates the floating "+1 EP" text that appears when you click.
// It works by creating a new div element, positioning it where the click happened, and then using a CSS animation to make it float up and fade out.
function createClickPopup(text, options) {
    const popup = document.createElement('div');
    popup.innerHTML = text; popup.className = 'click-popup';
    document.body.appendChild(popup);
    const rect = options.target.getBoundingClientRect();
    popup.style.left = `${rect.left + (rect.width / 2) - (popup.offsetWidth / 2)}px`;
    popup.style.top = `${rect.top - popup.offsetHeight}px`;
    setTimeout(() => popup.remove(), 1100);
}

// This function is called whenever a player clicks a post interaction button. It determines which button was clicked, adds the set number of points, disables the button, and updates the display
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

    // The "Like" action is different because it's the main way the player manually generates new content. I tested the game with and without this, but i think it makes the game feel better. The user has a direct impact on the feed.
    // At first I had it so the LikeBot wouldn't cause a tweet to be generated but after testing it actually felt more engaging so I included it.
    if (interactionType === 'Like') {
        addNotification("Your Like prompted Nathan to tweet!", "system");
        createAndAppendTweet();
    }
    updateAllDisplays();
}

// This function builds a new tweet HTML structure entirely within JavaScript. It uses "document.createElement" to create each div, p, img, etc., sets their classes and content, and then uses "appendChild" to put them together.
// At a certain point this also removes old tweets to keep the page from getting too slow.
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


// Each "feature" unlock has a seperate function that checks if the player has enough points and if they do removes the the cost from their EP and sets the unlock flag to true.

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

// This function uses "setInterval" to create the game's automation. When the progress reaches 100%, it clicks the bot's set button and resets the progress of the loading bar.
// This automation is the basis of the incremental/idle game genre. The bots run at different speeds for game balance.
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
    // The bot needs to find a button on the page that it can click.
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

// functions for the bot toggle buttons
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

// These functions ensure the visual display of the site lines up with the game state.
function updateAllDisplays() {

    document.getElementById('engagementPointsDisplay').textContent = formatNumber(engagementPoints);
    document.getElementById('totalTweetsDisplay').textContent = formatNumber(totalTweets);
    
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

    // this is the feature unlock list function, it shows or hides upgrades based on what the player has already unlocked. It also enables or disables the purchase buttons based on if the player can afford the upgrade.
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
    // Clear any timers and remove event listeners s
    if (autoSaveIntervalId) {
        clearInterval(autoSaveIntervalId);
        autoSaveIntervalId = null;
    }
    window.removeEventListener('beforeunload', saveGame);

    // Clear localStorage
    localStorage.removeItem('nathansTwitter2Save_v1.5');
    localStorage.removeItem('theme');

    window.location.reload();
}


// Reflection
//
// I had a pretty solid idea of what I wanted to create for this project. Once I had the idea of combining a social media satire with an incremental game, I figured I'd be pretty set to get it going. I have experience creating incremental game-like projects before,
// so I had a good understanding of what the logic would look like. I just had to figure out how to get this logic into javascript. Honestly, there are so many resources available that I think given enough time anyone could probably remake any site if they wanted to.
// I used Google's recent Gemini model to brainstorm how to structure the code and how to fix certain bugs that were bothering me (The flashing white screen when refreshing in dark mode made me so annoyed) but I wanted to make sure I was writing all the code myself.
//  I had difficulty managing all the different timers (setIntervals) for the bots and the auto-save. When loading a game or ending it, I had to be careful to clear all the  intervals to prevent them from running in the background and causing bugs or performance issues.
// Figuring out the right way to set up the CSS for mobile use was tricky too, but I was pleased with the multiple tabs solution. The site definitely could run cleaner, but it's pretty much fully functional on desktop and mobile, so I'm happy with it. 
// 
// Writing out all of the tweets was a lot of fun. I just had a list that I'd come back to every once in a while. I had periods where I'd just scroll through instagram and write down whatever I felt the platform was making me feeling, or try remake someone's post from 
// Nathan's point of view. He's an interesting guy. I definitely wouldn't follow him if I had the choice. If I expanded this prototype into a fully featured game I'd add different upgrade tiers of interactions, i.e. upgrading the Like to give more EP or make the 
// RepostBot twice as fast or something like that. I'd also like to add more interactivity based on the specific interactions you have with Nathan, and the content he posts that you choose to like. I'd also like to add a comment/messaging with Nathan 
// feature, but that's beyond the scope of this project.
//
// The Twitter logo is used for parody purposes. All other images were generated by me using ChatGPT. All tweets were written by me.
//