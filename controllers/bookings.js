const Booking = require('../models/Booking');
const Campground = require('../models/Campground');

//@desc     Get all bookings
//@route    GET /api/v1/bookings
//@access   Private
exports.getBookings = async (req, res, next) => {
    try {
        let query;

        // If user is admin, get all bookings
        // Otherwise, get only user's bookings
        if (req.user.role === 'admin') {
            if (req.params.campgroundId) {
                query = Booking.find({ campground: req.params.campgroundId })
                    .populate({
                        path: 'campground',
                        select: 'name address tel'
                    });
            } else {
                query = Booking.find()
                    .populate({
                        path: 'campground',
                        select: 'name address tel'
                    });
            }
        } else {
            // Regular user can only see their own bookings
            query = Booking.find({ user: req.user.id })
                .populate({
                    path: 'campground',
                    select: 'name address tel'
                });
        }

        const bookings = await query;

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Cannot find bookings' });
    }
};

//@desc     Get single booking
//@route    GET /api/v1/bookings/:id
//@access   Private
exports.getBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate({
                path: 'campground',
                select: 'name address tel'
            });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        // Make sure user is booking owner or admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to view this booking`
            });
        }

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot find booking'
        });
    }
};

//@desc     Add booking
//@route    POST /api/v1/campgrounds/:campgroundId/bookings
//@access   Private
exports.addBooking = async (req, res, next) => {
    try {
        // Add campground to req.body
        req.body.campground = req.params.campgroundId;

        // Add user to req.body
        req.body.user = req.user.id;

        // Check if campground exists
        const campground = await Campground.findById(req.params.campgroundId);

        if (!campground) {
            return res.status(404).json({
                success: false,
                message: `No campground with the id of ${req.params.campgroundId}`
            });
        }

        // Validate nights count (max 3 nights)
        if (req.body.nightsCount && req.body.nightsCount > 3) {
            return res.status(400).json({
                success: false,
                message: 'Cannot book more than 3 nights'
            });
        }

        // Check for existing bookings by user
        const existingBookings = await Booking.find({ user: req.user.id });

        // If the user is not an admin, they can only create 3 bookings
        if (existingBookings.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: `The user with ID ${req.user.id} has already made 3 bookings`
            });
        }

        // Create booking
        const booking = await Booking.create(req.body);

        res.status(201).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot create booking'
        });
    }
};

//@desc     Update booking
//@route    PUT /api/v1/bookings/:id
//@access   Private
exports.updateBooking = async (req, res, next) => {
    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        // Make sure user is booking owner or admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to update this booking`
            });
        }

        // Validate nights count if provided
        if (req.body.nightsCount && req.body.nightsCount > 3) {
            return res.status(400).json({
                success: false,
                message: 'Cannot book more than 3 nights'
            });
        }

        booking = await Booking.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot update booking'
        });
    }
};

//@desc     Delete booking
//@route    DELETE /api/v1/bookings/:id
//@access   Private
exports.deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        // Make sure user is booking owner or admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to delete this booking`
            });
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot delete booking'
        });
    }
};
