<!-- source: https://developers.figma.com/docs/rest-api/users-types -->

- REST API
- Users
- Types

On this page

A user is a Figma account of an individual that has signed up for Figma and created an account.

## Types[​](#types "Direct link to Types")

Every user will have recorded ― and can be identified by ― the following four properties:

| Type | Properties |
| --- | --- |
| User[​](#user-type "Direct link to User") | `id`String  Unique stable id of the user  `handle`String  Name of the user  `img_url`String  URL link to the user's profile image  `email`String  Email associated with the user's account. This will only be present on the `/v1/me` endpoint |

[Next

Endpoints](users-endpoints.md)

- [Types](#types)
  - [User](#user-type)
