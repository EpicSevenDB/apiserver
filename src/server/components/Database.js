import { MongoClient } from 'mongodb';
import { DB, MESSAGES } from '../utils/Constants';

class Database {
	constructor() {
		this.mongoClient = {};
		this.mongoClientDb = {};
		Object.seal(this);
	}
	get client() {
		return this.mongoClient;
	}
	get db() {
		return this.mongoClientDb;
	}

	set client(client) {
		return (this.mongoClient = client);
	}

	set db(db) {
		return (this.mongoClientDb = db);
	}

	getCollection(tableName) {
        if (!isSupportedTable(tableName)) {
            throw new Error(MESSAGES.db.noTable);
		}
		if (typeof this.db.collection !== 'function') {
			return undefined;
		}
        return this.db.collection(tableName);
	}

	connect() {
		return MongoClient.connect(
			DB.url,
			{
				useNewUrlParser: true,
				autoReconnect: true,
				reconnectTries: 100,
				reconnectInterval: 5000, //ms
			}
		)
			.then((client) => {
				this.client = client;
				this.db = this.client.db(DB.name);
			})
			.catch((err = '') => {
				throw new Error(err);
			});
	}
}

export default new Database();
