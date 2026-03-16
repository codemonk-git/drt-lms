#!/bin/bash
# Test FCM notification with deep linking to lead detail

# FCM token from the logged-in user
FCM_TOKEN="ezfSD9izR0aY5yLWsuup5r:APA91bEGPjVrxfWvrvtE_ztY2pOTkvSZuUuCB9SChffKQ3KKM0JEFOor0E87SRHZjtrjAY_NVy5x5GTHjQwt9dgwVKec70HJdvCwUqLhUkfvFIESWujgMBA"

# Lead to open when notification is tapped
LEAD_ID="54c8eb56-6640-49b3-bef9-6c9ebb8773fd"
LEAD_NAME="Shaili Chouhan"

# Backend URL
BACKEND_URL="http://localhost:8000"

echo "🚀 Sending test FCM notification with deep linking..."
echo "📌 Lead: $LEAD_NAME ($LEAD_ID)"
echo "📱 Device Token: ${FCM_TOKEN:0:50}..."
echo ""

# Send test notification
curl -X POST "$BACKEND_URL/api/fcm/test-notification" \
  -H "Content-Type: application/json" \
  -d "{
    \"device_token\": \"$FCM_TOKEN\",
    \"title\": \"Follow up with $LEAD_NAME\",
    \"body\": \"Time to call and check in\",
    \"lead_id\": \"$LEAD_ID\",
    \"lead_name\": \"$LEAD_NAME\"
  }"

echo ""
echo ""
echo "✅ Test notification sent!"
echo "📲 Check your phone - you should see the notification"
echo "👆 Tap the notification to open lead detail view"
