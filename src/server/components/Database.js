import { MongoClient } from 'mongodb';
import { DB, DB2 } from '../utils/Constants';

// https://medium.com/@naumanzafarchaudhry/using-mongodb-on-heroku-without-verifying-your-account-9053a8c42e3c
class Database {
	constructor() {
		this.mongoClient = {};
		this.mongoClientDb = {};
		this.mongoClient2 = {};
		this.mongoClientDb2 = {};
		Object.seal(this);
	}

	//V1
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

	//V2
	get client2() {
		return this.mongoClient2;
	}
	get db2() {
		return this.mongoClientDb2;
	}

	set client2(client) {
		return (this.mongoClient2 = client);
	}

	set db2(db) {
		return (this.mongoClientDb2 = db);
	}

	getCollection(collectionName, dbtype = 1) {
		if (dbtype === 1) {
			if (typeof this.db.collection !== 'function') {
				return undefined;
			}
			return this.db.collection(collectionName);
		}

		if (dbtype === 2) {
			if (typeof this.db2.collection !== 'function') {
				return undefined;
			}
			return this.db2.collection(collectionName);
		}
	}

	//connecting
	connect() {
		return DB2.url && DB2.name ? this.connectMultiple() : this.connectSingle();
	}

	connectMultiple() {
		return Promise.all([
			MongoClient.connect(DB.url, {
				useNewUrlParser: true,
				autoReconnect: true,
				reconnectTries: 100,
				reconnectInterval: 5000, //ms
			}).catch((err = '') => {
				throw new Error(err);
			}),
			MongoClient.connect(DB2.url, {
				useNewUrlParser: true,
				autoReconnect: true,
				reconnectTries: 100,
				reconnectInterval: 5000, //ms
			}).catch((err = '') => {
				throw new Error(err);
			}),
		])
			.then(([client1, client2]) => {
				this.client = client1;
				this.db = this.client.db(DB.name);
				this.client2 = client2;
				this.db2 = this.client2.db(DB2.name);
			})
			.catch((err = '') => {
				throw new Error(err);
			});
	}

	connectSingle() {
		return MongoClient.connect(DB.url, {
			useNewUrlParser: true,
			autoReconnect: true,
			reconnectTries: 100,
			reconnectInterval: 5000, //ms
		})
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
