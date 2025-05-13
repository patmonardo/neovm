import { Configuration } from "@/annotations/Configuration";
import { JobId } from "@/core/utils/progress/JobId";

@Configuration
export abstract class JobIdConfig {
  /**
   * Returns the job ID for this configuration
   */
  @Configuration.ConvertWith("JobIdConfig.parse")
  @Configuration.ToMapValue("JobIdConfig.asString")
  jobId(): JobId {
    return new JobId();
  }

  /**
   * Parse a value into a JobId
   */
  static parse(input: any): JobId {
    return JobId.parse(input);
  }

  /**
   * Convert a JobId to string for serialization
   */
  static asString(jobId: JobId): string {
    return JobId.asString(jobId);
  }
}
