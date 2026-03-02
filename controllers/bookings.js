const Booking = require('../models/Booking');
const Campground = require('../models/Campground');

//@desc     Get all bookings
//@route    GET /api/v1/bookings
//@access   Private
exports.getBookings = async (req, res, next) => {
    try {
        let query;

        // if campgroundId is provided, allow admin or campground owner
        if (req.params.campgroundId) {
            const campground = await Campground.findById(req.params.campgroundId);
            if (!campground) {
                return res.status(404).json({
                    success: false,
                    message: `No campground with the id of ${req.params.campgroundId}`
                });
            }
            if (req.user.role !== 'admin' && campground.owner.toString() !== req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized to view bookings for this campground'
                });
            }

            query = Booking.find({ campground: req.params.campgroundId })
                .populate({
                    path: 'campground',
                    select: 'name address tel'
                });
        } else {
            // only admins can request the full list when no campground is specified
            if (req.user.role !== 'admin') {
                return res.status(401).json({
                    success: false,
                    message: 'Only administrators can view all bookings'
                });
            }

            query = Booking.find()
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

        // Make sure user is booking owner, campground owner or admin
        const bookingCampground = await Campground.findById(booking.campground);
        const isCampOwner = bookingCampground && bookingCampground.owner.toString() === req.user.id;
        if (
            booking.user.toString() !== req.user.id &&
            req.user.role !== 'admin' &&
            !isCampOwner
        ) {
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

        // ignore any nightsCount supplied by client
        delete req.body.nightsCount;

        // Check if campground exists
        const campground = await Campground.findById(req.params.campgroundId);

        if (!campground) {
            return res.status(404).json({
                success: false,
                message: `No campground with the id of ${req.params.campgroundId}`
            });
        }

        // ensure dates are present
        const { checkInDate, checkOutDate } = req.body;
        if (!checkInDate || !checkOutDate) {
            return res.status(400).json({
                success: false,
                message: 'Both checkInDate and checkOutDate are required'
            });
        }

        const newIn = new Date(checkInDate);
        const newOut = new Date(checkOutDate);

        if (newOut <= newIn) {
            return res.status(400).json({
                success: false,
                message: 'checkOutDate must be later than checkInDate'
            });
        }

        // overlap check: existing.checkInDate < newOut && existing.checkOutDate > newIn
        const overlap = await Booking.findOne({
            campground: req.params.campgroundId,
            checkInDate: { $lt: newOut },
            checkOutDate: { $gt: newIn }
        });

        if (overlap) {
            return res.status(400).json({
                success: false,
                message: 'The requested dates overlap an existing booking'
            });
        }

        // Create booking; pre-save hook will calculate nightsCount and validate date range
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

        // Make sure user is booking owner, campground owner or admin
        const bookingCampground = await Campground.findById(booking.campground);
        const isCampOwner = bookingCampground && bookingCampground.owner.toString() === req.user.id;
        if (
            booking.user.toString() !== req.user.id &&
            req.user.role !== 'admin' &&
            !isCampOwner
        ) {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to update this booking`
            });
        }

        // if dates are being updated, validate presence
        const { checkInDate, checkOutDate } = req.body;
        if ((checkInDate && !checkOutDate) || (!checkInDate && checkOutDate)) {
            return res.status(400).json({
                success: false,
                message: 'Both checkInDate and checkOutDate must be provided when updating dates'
            });
        }

        // if dates provided, check for overlap excluding current booking
        if (checkInDate && checkOutDate) {
            const newIn = new Date(checkInDate);
            const newOut = new Date(checkOutDate);

            if (newOut <= newIn) {
                return res.status(400).json({
                    success: false,
                    message: 'checkOutDate must be later than checkInDate'
                });
            }

            const overlap = await Booking.findOne({
                campground: booking.campground,
                _id: { $ne: booking._id },
                checkInDate: { $lt: newOut },
                checkOutDate: { $gt: newIn }
            });

            if (overlap) {
                return res.status(400).json({
                    success: false,
                    message: 'The updated dates overlap another booking'
                });
            }
        }

        // ensure client cannot override nightsCount
        delete req.body.nightsCount;

        // assign fields manually so that pre-save hook runs
        if (Object.keys(req.body).length > 0) {
            Object.assign(booking, req.body);
        }
        // save triggers pre hook to recalc nightsCount and validate
        await booking.save();

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

        // Make sure user is booking owner, campground owner or admin
        const bookingCampground = await Campground.findById(booking.campground);
        const isCampOwner = bookingCampground && bookingCampground.owner.toString() === req.user.id;
        if (
            booking.user.toString() !== req.user.id &&
            req.user.role !== 'admin' &&
            !isCampOwner
        ) {
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
