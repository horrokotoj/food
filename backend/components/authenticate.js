const jwt = require('jsonwebtoken');

module.exports = {
	authenticateToken: function (req, res, next) {
		if (req.headers['authorization']) {
			console.log(req.headers['authorization']);
			const authHeader = req.headers['authorization'];
			const token = authHeader.split(' ')[1];
			jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
				if (err) {
					return res.sendStatus(403);
				}
				req.user = user;
				next();
			});
		} else {
			return res.sendStatus(401);
		}
	},
	authenticateRefreshToken: function (req, res, next) {
		if (req.headers['authorization']) {
			const authHeader = req.headers['authorization'];
			const token = authHeader.split(' ')[1];
			jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
				if (err) {
					return res.sendStatus(403);
				}
				req.user = user;
				next();
			});
		} else {
			return res.sendStatus(401);
		}
	},
};
