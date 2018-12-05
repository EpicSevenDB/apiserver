import express from 'express';
import device from 'express-device';
import hbs from 'hbs';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import paths from '../utils/Paths';
import { MESSAGES } from '../utils/Constants';
import { getDateNow, cLog } from '../utils/Utility';

export default class Server {
	constructor(options = {}) {
		const { Database } = options;

		this.app = express();
		this.port = process.env.PORT || 8082;
		hbs.localsAsTemplateData(this.app);

		this.app.use(device.capture());
		this.app.use(bodyParser.json());
		this.app.use(helmet());
		this.app.use(helmet.permittedCrossDomainPolicies());
		this.app.use(
			helmet.contentSecurityPolicy({
				directives: {
					defaultSrc: ["'self'"],
					imgSrc: ["'self'", 'data:'],
					scriptSrc: ["'self'", "'unsafe-inline'"],
					fontSrc: ["'self'", '*.fontawesome.com', '*.googleapis.com', '*.gstatic.com'],
					styleSrc: ["'self'", "'unsafe-inline'", '*.fontawesome.com', '*.googleapis.com'],
				},
			})
		);

		this.app.set('view engine', 'hbs');
		this.app.set('views', `${paths.server}/views`);
		hbs.registerPartials(`${paths.server}/views/partials`);

		this.app.get('/status', (req, res) => {
			res.sendStatus(200);
		});

		this.start = () => {
			if (Database && typeof Database.connect === 'function') {
				Database.connect()
					.then(() => {
						this.serverStart();
					})
					.catch((error) => {
						cLog('error', MESSAGES.db.dbConnectionServer);
						cLog('error', error.stack);
						process.exit(1);
					});
			} else {
				this.serverStart();
			}
		};
	}

	serverStart() {
		this.app.listen(this.port, () => {
			cLog('log', `${MESSAGES.server.start} ${this.port} @ ${getDateNow()}`);
		});
	}
}
