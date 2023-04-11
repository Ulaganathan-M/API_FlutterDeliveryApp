const mongoose = require('mongoose');
const { Schema } = mongoose;

const contactSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  number: {
    type: String,
    required: true
  }
});

module.exports = contactSchema;