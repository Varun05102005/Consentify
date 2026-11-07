import {initializeApp} from 'firebase-admin/app';
import {explainAppRisk} from './explainAppRisk';
import {ingestAppScan} from './ingestAppScan';

initializeApp();

export {explainAppRisk, ingestAppScan};
