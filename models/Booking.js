const mongoose = require('mongoose');
const Campground = require('./Campground');

const BookingSchema = new mongoose.Schema({
    // check-in and check-out replace apptDate/nightsCount
    checkInDate: {
        type: Date,
        required: [true, 'Please provide check-in date']
    },
    checkOutDate: {
        type: Date,
        required: [true, 'Please provide check-out date']
    },
    nightsCount: {
        type: Number,
        // calculated automatically from dates; not provided by client
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

// pre-save hook calculates nightsCount and validates dates
BookingSchema.pre('save', async function() {
    // only run when dates are modified or new
    if (this.isModified('checkInDate') || this.isModified('checkOutDate')) {
        if (!this.checkInDate || !this.checkOutDate) {
            throw new Error('Both check-in and check-out dates are required');
        }

        if (this.checkOutDate <= this.checkInDate) {
            throw new Error('checkOutDate must be later than checkInDate');
        }

        // compute full days difference
        const msPerDay = 24 * 60 * 60 * 1000;
        const diff = Math.ceil((this.checkOutDate - this.checkInDate) / msPerDay);
        this.nightsCount = diff;

        if (this.nightsCount < 1) {
            throw new Error('Minimum stay is 1 night');
        }
        if (this.nightsCount > 3) {
            throw new Error('Maximum stay is 3 nights');
        }
    }
});

module.exports = mongoose.model('Booking',BookingSchema);