const ACCEPTED_MESSAGES = [
	"You're in! 🚀",
	'Nice one — pot’s growing! 💰',
	'Good vibes only 🌈',
	'Next one could be you 👀',
	'Heat rising… 🔥',
	'You just nudged the cycle forward ↗️',
	'Keep going, luck favors the persistent 🍀',
	'That’s another step closer 🧗',
	'Momentum! ⚡',
	'We like your style 😎',
];

const WIN_MESSAGES = [
	'Boooom! You hit the jackpot! 💥',
	'🔥 YOU WON! 🔥',
	'Legend status unlocked 🏆',
	'Winner winner USDC dinner 🍽️',
	'Cycle champion! 👑',
	'You snapped the pot — big GG! 🎉',
	'TENBACK MASTER! 🚀',
	'Absolute clutch win 🤝',
	'Everything aligned for you today 🌠',
	'Sweet victory! 🎊',
];

function pickRandom<T>(arr: readonly T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

export function randomAcceptedMessage() {
	return pickRandom(ACCEPTED_MESSAGES);
}

export function randomWinMessage() {
	return pickRandom(WIN_MESSAGES);
}
