import { alertService } from '../alert-service';
import { storage } from '../storage';

/**
 * Background job to process alert rules for all organizations
 */
export async function processAlerts(): Promise<{
  success: boolean;
  totalOrganizations: number;
  totalEvaluated: number;
  totalTriggered: number;
  errors: string[];
}> {
  console.log('Starting alert processing job...');
  const startTime = Date.now();

  let totalEvaluated = 0;
  let totalTriggered = 0;
  const allErrors: string[] = [];

  try {
    // Get all organizations that have alert rules
    const organizations = await storage.queryRaw(`
      SELECT DISTINCT organization_id 
      FROM alert_rules 
      WHERE is_active = true
    `);

    console.log(`Processing alerts for ${organizations.length} organizations`);

    for (const org of organizations) {
      try {
        const result = await alertService.processAlertsForOrganization(org.organization_id);
        totalEvaluated += result.evaluated;
        totalTriggered += result.triggered;
        allErrors.push(...result.errors);

        if (result.triggered > 0) {
          console.log(`Organization ${org.organization_id}: ${result.triggered} alerts triggered`);
        }
      } catch (error) {
        const errorMsg = `Failed to process alerts for organization ${org.organization_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        allErrors.push(errorMsg);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Alert processing completed in ${duration}ms - Evaluated: ${totalEvaluated}, Triggered: ${totalTriggered}`);

    return {
      success: true,
      totalOrganizations: organizations.length,
      totalEvaluated,
      totalTriggered,
      errors: allErrors,
    };

  } catch (error) {
    const errorMsg = `Critical error in alert processing: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    
    return {
      success: false,
      totalOrganizations: 0,
      totalEvaluated,
      totalTriggered,
      errors: [errorMsg, ...allErrors],
    };
  }
}