import express from 'express';
import timeout from 'connect-timeout';
import { cLog, getDateNow } from '../utils/Utility';
import Routes from '../routes';

const router = express.Router();

// log all requests
router.use(function(req, res, next) {
	cLog('log', `${getDateNow()} :: ${req.ip} REQ: ${req.originalUrl} || REF: ${req.get('Referrer')}`);
	next();
});
router.get('/artifact/:_id', timeout('15s'), Routes.artifactDetail);
router.get('/artifact', timeout('15s'), Routes.artifactList);
router.get('/hero/:_id', timeout('15s'), Routes.heroDetail);
router.get('/hero', timeout('15s'), Routes.heroList);
router.get('/item/:_id', timeout('15s'), Routes.itemDetail);
router.get('/item', timeout('15s'), Routes.itemList);

router.get('/ranking', timeout('15s'), Routes.arenaRanking);

export default router;
