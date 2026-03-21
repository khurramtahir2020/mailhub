# AWS SES Setup Guide for MailHub

## Prerequisites

- AWS account with billing enabled
- AWS CLI installed (optional but recommended)

## Step 1: Create IAM User

1. Go to AWS Console > IAM > Users > Create User
2. Name: `mailhub-ses`
3. Attach the policy from `iam-policy.json` in this directory
4. Create access keys (Access Key ID + Secret Access Key)
5. Store credentials securely

## Step 2: SES Configuration Set

1. Go to AWS Console > SES > Configuration Sets
2. Create configuration set named `mailhub-production`
3. This configuration set will be used to track all email events

## Step 3: SNS Topic for Event Notifications

1. Go to AWS Console > SNS > Topics > Create Topic
2. Type: Standard
3. Name: `mailhub-ses-events`
4. Note the Topic ARN

### Add Event Destination to Configuration Set

1. Go to SES > Configuration Sets > `mailhub-production` > Event destinations
2. Create event destination:
   - Name: `mailhub-events`
   - Events: Send, Delivery, Bounce, Complaint, Reject
   - Destination: SNS Topic (`mailhub-ses-events`)

### Create SNS Subscription

1. Go to SNS > Topics > `mailhub-ses-events` > Create Subscription
2. Protocol: HTTPS
3. Endpoint: `https://your-api-domain.com/api/v1/webhooks/ses`
4. AWS will send a confirmation request to your endpoint

## Step 4: Request SES Production Access

1. Go to SES > Account Dashboard
2. Click "Request production access"
3. Fill out the form:
   - Mail type: Transactional
   - Website URL: Your application URL
   - Use case description: Transactional email service for verified business domains
4. Wait for approval (usually 24-48 hours)

## Step 5: Environment Variables

Add these to your `.env` file:

```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
SES_CONFIGURATION_SET=mailhub-production
```

## Notes

- In sandbox mode, you can only send to verified email addresses
- Production access removes the sending restrictions
- The IAM policy in this directory grants minimum required permissions
- SES has a default sending quota; monitor usage in the SES dashboard
