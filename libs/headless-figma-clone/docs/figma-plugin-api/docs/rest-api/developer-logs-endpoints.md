<!-- source: https://developers.figma.com/docs/rest-api/developer-logs-endpoints -->

- REST API
- Developer logs
- Endpoints

On this page

## POST developer logs[​](#post-developer-logs-endpoint "Direct link to POST developer logs")

**This API is available to organization administrators on Enterprise plans with the Governance+ add-on.**

The `POST /v1/developer_logs` endpoint lets you search for API access records across your organization. You can filter by token, user, IP address, token type, event source, and date range.

info

This is a [Tier 3 endpoint](rate-limits.md#rate-limits-tier-table) and requires the [`org:developer_log_read` scope](scopes.md). This endpoint can only be used with a [plan access token](plan-access-tokens.md).

### HTTP Endpoint[​](#http-endpoint "Direct link to HTTP Endpoint")

`POST /v1/developer_logs`

**Return value**

```
{  
  "status": Number,  
  "error": Boolean,  
  "meta": {  
    "items": [  
      {  
        "uuid": String,  
        "timestamp": String,  
        "action": {  
          "event_name": String,  
          "event_source": String  
        },  
        "actor": {  
          "user_id": String,  
          "user_name": String,  
          "token_name": String,  
          "token_type": String,  
          "user_email": String  
        },  
        "resource": {  
          "id_or_key": String,  
          "name": String,  
          "type": String,  
          "org_id": String  
        },  
        "context": {  
          "ip_address": String,  
          "city": String,  
          "country_region": String,  
          "country": String  
        }  
      },  
      ...  
    ],  
    "cursor": String,  
    "has_more": Boolean  
  }  
}
```

| Body parameters | Description |
| --- | --- |
| token | String  An access token secret (e.g., `figu_12345`). The token is hashed to find matching API access records that were authenticated with it. This is useful for investigating a leaked token. |
| token\_name | String  A name or prefix of a personal access token, plan access token, or OAuth app. Accepts a comma-separated list of values that are treated as an OR condition. |
| user\_email | String  A name or prefix of a user's email address. Searches for API calls made with a personal access token or OAuth connection from the given user. This will not return results for plan access tokens, since those are not tied to an individual user. Accepts a comma-separated list of values that are treated as an OR condition. |
| ip\_address | String  An IP address or prefix. Searches for API calls made from the given IP address. Accepts a comma-separated list of values that are treated as an OR condition. |
| token\_type | String  The type of token used to authenticate the API call, as a string enum.   - `PLAN_ACCESS_TOKEN` - `PERSONAL_ACCESS_TOKEN` - `OAUTH_TOKEN` |
| event\_source | String  The source of the API call, as a string enum.   - `REST_API` - `MCP_SERVER` |
| date\_range | String  The time range to search within, as a string enum.   - `LAST_24H` - `LAST_7D` - `LAST_30D` |
| limit | Numberdefault: 25  Limit the number of records to return. Maximum value is 100. |
| cursor | String  Cursor for pagination. Used to retrieve the next page of data. Obtained from the `cursor` field in the response of the previous call. |

| Error codes | Description |
| --- | --- |
| 400 | Invalid parameter. The `message` parameter on the response will describe the error. |
| 401 | Issue with authentication. The `message` parameter on the response will describe the error. |
| 403 | API is not available. Possible error messages are `Limited by Figma plan`, `Incorrect account type`, or `Invalid scope`. This could also indicate the developer / OAuth token is invalid or expired. |

### Example[​](#example "Direct link to Example")

The following is an example response from the POST developer logs endpoint. The `items` array contains log entries for both REST API and MCP server events.

```
{  
  "error": false,  
  "status": 200,  
  "meta": {  
    "items": [  
      {  
        "uuid": "5f429b01-b1e0-4f82-8767-a41013ec2da2",  
        "timestamp": "2026-04-14T21:35:11.086Z",  
        "action": {  
          "event_name": "/v1/activity_logs",  
          "event_source": "rest_api"  
        },  
        "actor": {  
          "user_id": "1234567890",  
          "user_name": "Sally Fields",  
          "token_name": "Audit Log Ingestion",  
          "token_type": "oauth_token",  
          "user_email": "sfields@figma.com"  
        },  
        "resource": {  
          "org_id": "1234567890"  
        },  
        "context": {  
          "ip_address": "1.2.3.4",  
          "city": "Boardman",  
          "country_region": "OR",  
          "country": "US"  
        }  
      },  
      {  
        "uuid": "cfb9afbe-be2f-43fc-8e66-deb803b17452",  
        "timestamp": "2026-04-14T21:40:29.881Z",  
        "action": {  
          "event_name": "get_figjam",  
          "event_source": "mcp_server"  
        },  
        "actor": {  
          "user_id": "1234567890",  
          "user_name": "John Hancock",  
          "token_name": "Claude Code MCP",  
          "token_type": "oauth_token",  
          "user_email": "jhancock@figma.com"  
        },  
        "resource": {  
          "id_or_key": "OWkR3ICVMqixoNdC9dr1jK",  
          "name": "Offsite Agenda",  
          "type": "file",  
          "org_id": "1234567890"  
        },  
        "context": {  
          "ip_address": "1.2.3.4",  
          "city": "Alameda",  
          "country_region": "CA",  
          "country": "US"  
        }  
      }  
    ],  
    "cursor": "[1776202465493,'7b59a325-c4c8-4faa-9944-f8e58746c235']",  
    "has_more": true  
  }  
}
```

[Previous

Getting started](developer-logs.md)

- [POST developer logs](#post-developer-logs-endpoint)
