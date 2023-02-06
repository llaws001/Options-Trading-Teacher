
// sets up dependencies
const Alexa = require('ask-sdk');
const i18n = require('i18next');
const languageStrings = require('./languageStrings');
const util = require('./util.js');


function getAllEntitledProducts(inSkillProductList) {
  const entitledProductList = inSkillProductList.filter(record => record.entitled === 'ENTITLED');
  return entitledProductList;
}

/*
    Helper function that returns a speakable list of product names from a list of
    entitled products.
*/
function getSpeakableListOfProducts(entitleProductsList) {
  const productNameList = entitleProductsList.map(item => item.name);
  let productListSpeech = productNameList.join(', '); // Generate a single string with comma separated product names
  productListSpeech = productListSpeech.replace(/_([^_]*)$/, 'and $1'); // Replace last comma with an 'and '
  return productListSpeech;
}




//ISP Handlers
const WhatCanIBuyHandler = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'WhatCanIBuyIntent';
  },
   
  handle(handlerInput) {
   const locale = handlerInput.requestEnvelope.request.locale;
   const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
   
    //does not own a product
    return ms.getInSkillProducts(locale).then(function fetchPurchasableProducts(result) {
    const purchasableProducts = result.inSkillProducts.filter(record => record.entitled === 'NOT_ENTITLED' && record.purchasable === 'PURCHASABLE');
    if (purchasableProducts.length > 0) {

        return handlerInput.responseBuilder
          .speak(`Products available for purchase at this time are ${getSpeakableListOfProducts(purchasableProducts)}.` + ' If you are ready to purchase, say, \'Buy\'')
          .reprompt('I didn\'t catch that. What can I help you with?')
          .getResponse();
      }
      //owns a product
        return handlerInput.responseBuilder
          .speak(`You currently own all purchaseable products.`)
          .reprompt('I didn\'t catch that. What can I help you with?')
          .getResponse();
    });
  },
};

const BuyHandler = {
    canHandle(handlerInput){
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name === 'BuyIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
        .addDirective({
            type: "Connections.SendRequest",
            name: "Buy",
            payload: {
                InSkillProduct: {
                    productId: "removed for security reasons",
                }
            },
            token: new Date().getTime().toString()
        })
        .getResponse();
  }
};


const BuyResponseHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response' &&
            (handlerInput.requestEnvelope.request.name === 'Upsell' || handlerInput.requestEnvelope.request.name === 'Buy');        
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        // get current session attributes
        const sessionAttributes = attributesManager.getSessionAttributes();

        const requestPayload = handlerInput.requestEnvelope.request.payload;
        let speakOutput = '';

        // route control of skill flow based on purchase result
        switch (requestPayload.purchaseResult) {
            // successful purchase
            case 'ACCEPTED':
                // update session attributes with property we can check in other intent handlers
                attributesManager.setSessionAttributes(Object.assign({}, sessionAttributes, {
                    'hasExamplesEnabled': true
                }));
                speakOutput += 'Thanks for your purchase of options trading examples!';
                break;
            // user has already purchased the product
            case 'ALREADY_PURCHASED':
                speakOutput += 'You\'ve already purchased options trading examples.  Thanks!';
                break;
            // user did not purchase product
            case 'DECLINED':
                speakOutput += 'Maybe next time!';
                break;
            // there was an error in the response
            case 'ERROR':
                speakOutput += 'Sorry, something went wrong with your purchase.  Try again later!';
                break;
            default:
                speakOutput += 'Sorry, we\'re not sure what went wrong but we are looking into it.  Try again later!';
                break;
        }
        
       
        speakOutput += ' Say, "what are some examples" to hear an example';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const RefundIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RefundIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .addDirective({
                type: 'Connections.SendRequest',
                name: 'Cancel',
                payload: {
                    InSkillProduct: {
                        productId: 'removed for security reasons'
                    }
                },
                token: new Date().getTime().toString()
            })
            .getResponse();
    }
};


const RefundPurchaseResponseHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response' &&
            handlerInput.requestEnvelope.request.name === 'Cancel';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        //reset sessionAttributes
        attributesManager.setSessionAttributes(Object.assign({}, sessionAttributes, {
                    'hasExamplesEnabled': false
        }));
        const speakOutput = 'Your refund is complete. Say, teach me about options, for a lesson.'

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



//expansion
const GetExampleHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
    handlerInput.requestEnvelope.request.intent.name === 'GetExampleIntent';
  },
  handle(handlerInput) {
    const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        

        const hasExamplesEnabled = (sessionAttributes['hasExamplesEnabled']) ? true : false;
        // we use the boolean to determine if the user has access to the expansion
        const speakOutput = (hasExamplesEnabled) ? util.getExamples() : 'You do not have that expansion. You can say, buy examples, to purchase it.';
        sessionAttributes.lastResponse = speakOutput;   
        handlerInput.attributesManager.setSessionAttributes( sessionAttributes );
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Would you like a lesson?')
            .getResponse();
  },
};

//core skill
const GetOptionsLessonHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'GetOptionsLessonIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const speakOutput = requestAttributes.t('GET_FACT_MESSAGE') + util.getLesson();
    
    const sessionAttributes =  handlerInput.attributesManager.getSessionAttributes(); 
     sessionAttributes.lastResponse = speakOutput;   
     handlerInput.attributesManager.setSessionAttributes( sessionAttributes );

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(requestAttributes.t('HELP_REPROMPT'))
      .getResponse();
  },
};

//repeat
const RepeatIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.RepeatIntent'
    },
    handle(handlerInput) {
     // Get the session attributes.
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
    const { lastResponse } = sessionAttributes;
    const speakOutput = lastResponse;
   return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('You can say, "give me a lesson" for another lesson, or stop to exit the skill.')
            .getResponse();
  }
};
//Welcome message
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    let speakOutput = 'Welcome to Options Trading Teacher. Would you like a lesson, or an example?';
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    
    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
   
    //does not own a product
    return ms.getInSkillProducts(locale).then(function fetchPurchasableProducts(result) {
    const purchasableProducts = result.inSkillProducts.filter(record => record.entitled === 'NOT_ENTITLED' && record.purchasable === 'PURCHASABLE');
    if (purchasableProducts.length > 0) {
        speakOutput = 'Welcome to Options Trading Teacher. You are currently using the lite version of the skill.' + ` Products available for purchase at this time are ${getSpeakableListOfProducts(purchasableProducts)}.` + ' If you would like to purchase, say, "buy examples". If you would like a lesson, you can say, teach me about options.'
        
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
                attributesManager.setSessionAttributes(Object.assign({}, sessionAttributes, {
                    'hasExamplesEnabled': false
                }));
        
        
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt('Would you like a lesson?')
          .getResponse();
      }
      
    //owns product
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
                attributesManager.setSessionAttributes(Object.assign({}, sessionAttributes, {
                    'hasExamplesEnabled': true
                }));
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(requestAttributes.t('HELP_REPROMPT'))
      .getResponse();
    });
  },
}; 


const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('HELP_MESSAGE'))
      .reprompt(requestAttributes.t('HELP_REPROMPT'))
      .getResponse();
  },
};

const FallbackHandler = {
  // The FallbackIntent can only be sent in those locales which support it,
  // so this handler will always be skipped in locales where it is not supported.
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('FALLBACK_MESSAGE'))
      .reprompt(requestAttributes.t('FALLBACK_REPROMPT'))
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('STOP_MESSAGE'))
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('ERROR_MESSAGE'))
      .reprompt(requestAttributes.t('ERROR_MESSAGE'))
      .getResponse();
  },
};

const LocalizationInterceptor = {
  process(handlerInput) {
    // Gets the locale from the request and initializes i18next.
    const localizationClient = i18n.init({
      lng: handlerInput.requestEnvelope.request.locale,
      resources: languageStrings,
      returnObjects: true
    });
    // Creates a localize function to support arguments.
    localizationClient.localize = function localize() {
      // gets arguments through and passes them to
      // i18next using sprintf to replace string placeholders
      // with arguments.
      const args = arguments;
      const value = i18n.t(...args);
      // If an array is used then a random value is selected
      if (Array.isArray(value)) {
        return value[Math.floor(Math.random() * value.length)];
      }
      return value;
    };
    // this gets the request attributes and save the localize function inside
    // it to be used in a handler by calling requestAttributes.t(STRING_ID, [args...])
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function translate(...args) {
      return localizationClient.localize(...args);
    }
  }
};

const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    GetOptionsLessonHandler,
    WhatCanIBuyHandler,
    BuyHandler,
    BuyResponseHandler,
    GetExampleHandler,
    RefundIntentHandler,
    RefundPurchaseResponseHandler,
    RepeatIntentHandler,
    HelpHandler,
    ExitHandler,
    FallbackHandler,
    SessionEndedRequestHandler,
  )
    
  .addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('sample/basic-fact/v2')
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
