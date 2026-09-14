export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions?: string[];
}

export type GoogleUserInfo = {
  id: string; //google sub - provider user id
  email: string;
  verified_email: boolean;
  name?: string;
  picture?: string;
};
