/* *
 * We create a language strings object containing all of our strings.
 * The keys for each string will then be referenced in our code, e.g. handlerInput.t('WELCOME_MSG').
 * The localisation interceptor in index.js will automatically choose the strings
 * that match the request's locale.
 * */

module.exports = {
    en: {
        translation: {
            SKILL_NAME: 'Options Trading Teacher',
            GET_FACT_MESSAGE: 'Here is your lesson: ',
            HELP_MESSAGE: 'You can say teach me about options trading, or, you can say exit',
            HELP_REPROMPT: 'Would you like another lesson?',
            FALLBACK_MESSAGE: 'The Options Trading Teacher skill can\'t help you with that.  It can teach you about options trading if you say teach me about options trading. Would you like a lesson?',
            FALLBACK_REPROMPT: 'Would you like a lesson?',
            ERROR_MESSAGE: 'Sorry, an error occurred.',
            STOP_MESSAGE: 'Thank you for using Options Trading Teacher, Goodbye!',
        }
    },
}