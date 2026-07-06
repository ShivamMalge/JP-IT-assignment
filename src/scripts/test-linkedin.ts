import { LinkedInService } from '../services/linkedin';
import { logger } from '../utils/logger';

async function testLinkedIn() {
  const service = new LinkedInService();
  try {
    await service.initialize();
    await service.verifyLogin();
    logger.info('SUCCESS: LinkedIn cookies are valid and working!');
  } catch (error) {
    logger.error('FAILED to authenticate with LinkedIn: ', error);
  } finally {
    await service.close();
  }
}

testLinkedIn();
