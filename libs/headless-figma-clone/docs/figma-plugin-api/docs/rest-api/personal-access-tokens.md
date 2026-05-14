<!-- source: https://developers.figma.com/docs/rest-api/personal-access-tokens -->

- REST API
- Authentication
- Personal access tokens

On this page

A personal access token gives the holder access to an account through the API as if they were the user who generated the token.

## Generate a personal access token[​](#generate-a-personal-access-token "Direct link to Generate a personal access token")

1. Login to your Figma account.
2. From the [file browser](https://help.figma.com/hc/articles/14381406380183-Guide-to-the-file-browser), click the account menu in the top-left corner and select **Settings**.
3. Select the **Security** tab.
4. In the **Personal access tokens** section, click **Generate new token** to open the configuration modal.
5. Set the expiration and [scopes](scopes.md) for the token. The scopes will determine which endpoints the token has access to.
6. Click **Generate token**. This will be your only chance to copy the token, so make sure you keep a copy of this in a secure place.

From the **Security** tab of your account settings, you can hover over the name of an existing token to see what scopes it has. You can also see when the token was last used (give or take a few minutes). If you see any activity on a token that you did not initiate, revoke the token immediately. Revocations are instant and can be made at any time.

## Use the personal access token[​](#use-the-personal-access-token "Direct link to Use the personal access token")

You can now use the token to make requests to the Figma API. You can do so by passing the token to the API in the `X-Figma-Token` header of your request.

[Previous

Plan access tokens](plan-access-tokens.md)[Next

Scopes](scopes.md)

- [Generate a personal access token](#generate-a-personal-access-token)
- [Use the personal access token](#use-the-personal-access-token)
