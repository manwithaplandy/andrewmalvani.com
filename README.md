# Resume Website Project

This project hosts an interactive resume website built with React and hosted on AWS. The infrastructure is provisioned and managed using Terraform, ensuring a scalable, efficient, and version-controlled deployment process.

## Features

- **React Frontend**: A modern, fast, and responsive web frontend using React and Next.js.
- **AWS Hosting**: The website is hosted on AWS, leveraging services such as Amazon S3 for hosting static assets, and Amazon CloudFront for a global Content Delivery Network (CDN).
- **Terraform Infrastructure**: Infrastructure as Code (IaC) practices with Terraform to automate the setup, scalability, and maintenance of the AWS resources.
- **Responsive Design**: Designed to work on desktops, tablets, and mobile devices.

## AWS Services used

- AWS S3: For hosting static assets.
- AWS CloudFront: To provide a fast global content delivery network (CDN).
- AWS WAF: To track & prevent malicious traffic (disabled because it's not free)
- DynamoDB: Durable store for the anonymous aggregates behind the public [/stats](https://andrewmalvani.com/stats) page
- AWS Lambda: Contact-form handler (API Gateway → SNS) and the daily stats aggregator (EventBridge → CloudFront logs + Cloudflare analytics → stats.json)
- SNS: To deliver emails from the Contact section
- EventBridge: Daily 00:00 UTC schedule for the stats aggregator

## Stats pipeline setup (one-time manual steps)

The `/stats` page is fed by `stats_aggregator/lambda_function.py`. Three things live outside Terraform on purpose:

1. Cloudflare API token (Analytics:Read, zone-scoped) stored in SSM so it never touches TF state or GitHub:
   `aws ssm put-parameter --name /resume/cloudflare-analytics-token --type SecureString --value <token>`
2. GitHub repo variable `STATS_AGGREGATOR_FUNCTION_NAME` (set to `statsAggregator`) for the CI lambda-code update job.
3. GitHub repo variable `CLOUDFLARE_ZONE_ID` (zone ID for andrewmalvani.com) — until set, the aggregator skips the
   Cloudflare uniques/countries query and publishes CloudFront-derived metrics only.

First run: invoke `statsAggregator` manually a few times to chew through the historical log backlog (it processes as
much as fits in one 300 s run, marks progress in DynamoDB `marker#` items, and is safe to re-invoke — reprocessing can
never double-count).

## Contributing

Contributions are welcome! If you have improvements or bug fixes, please open a pull request with your changes.

## License

Specify your project's license here, providing details on how others can use and contribute to your project.
