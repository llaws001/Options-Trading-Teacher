
const examples = require('./examples.js');
const lesson = require('./lessons.js');
module.exports = {
    getExamples() {
        return examples[Math.floor(Math.random() * examples.length)];
    },
    getLesson() {
        return lesson[Math.floor(Math.random() * lesson.length)];
    },
};


