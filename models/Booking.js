const mongoose = require('mongoose');
const Campground = require('./Campground');

const BookingSchema = new mongoose.Schema({
    apptDate: {
        type: Date,
        required: true
    },
    nightsCount: {
        type: Number,
        required: [true, 'Please add nightsCount'],
        min: [1, 'Minimum nights is 1'],
        max: [3, 'Maximum nights is 3']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    campground: {
        type: mongoose.Schema.ObjectId,
        ref: 'Campground',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Booking',BookingSchema);