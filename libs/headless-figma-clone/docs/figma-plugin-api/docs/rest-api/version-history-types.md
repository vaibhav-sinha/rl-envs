<!-- source: https://developers.figma.com/docs/rest-api/version-history-types -->

- REST API
- Version history
- Types

On this page

Figma allows you to distinguish different stages or **Versions** of a file, as the file evolves over time. This is all recorded in the **Version history**, which allows users to view, track and restore previous versions of a file.

warning

**IMPORTANT:** The order of versions returned by GET file versions has changed. Versions are now ordered explicitly by when they were created. As a part of this change, the URL format for next\_page and prev\_page has also changed.

For more information, see the [changelog](changelog.md).

## Types[​](#types "Direct link to Types")

Figma will record some basic information about the file, like the who and when, as well as allow the user to determine a title and description for the version. These form the basis of the properties associated with version history.

| Type | Properties |
| --- | --- |
| Version[​](#version-type "Direct link to Version") A version of a file. | `id`String  Unique identifier for version.  `created_at`String  The UTC ISO 8601 time at which the version was created.  `label`String  The label given to the version in the editor.  `description`String  The description of the version as entered in the editor.  `user`[User](users-types.md#user-type)  The user that created the version. |

[Next

Endpoints](version-history-endpoints.md)

- [Types](#types)
  - [Version](#version-type)
