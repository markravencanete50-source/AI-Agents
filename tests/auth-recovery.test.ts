import test from 'node:test';
import assert from 'node:assert/strict';
import { signInFailure,signInRecovery } from '../apps/web/src/lib/auth-recovery.ts';

test('recovery handles provider errors in either query or fragment without reflecting descriptions',()=>{
 for(const suffix of ['?error=access_denied&error_code=otp_expired','#error=access_denied&error_code=otp_expired']){
  assert.match(signInRecovery(new URL('https://office.example/'+suffix))!,/expired or was already used/);
 }
 assert.match(signInRecovery(new URL('https://office.example/?signin=browser'))!,/another browser/);
 assert.equal(signInRecovery(new URL('https://office.example/#office')),null);
 assert.equal(signInRecovery(new URL('https://office.example/?code=example')),null);
 assert.doesNotMatch(signInRecovery(new URL('https://office.example/?error=unknown&error_description=UNTRUSTED'))!,/UNTRUSTED/);
});

test('callback distinguishes expired links, missing PKCE state, and other failures',()=>{
 assert.equal(signInFailure({code:'otp_expired'}),'expired');
 assert.equal(signInFailure({code:'bad_code_verifier'}),'browser');
 assert.equal(signInFailure({code:'flow_state_not_found'}),'browser');
 assert.equal(signInFailure({message:'PKCE code verifier not found in storage'}),'browser');
 assert.equal(signInFailure({code:'unexpected_failure'}),'failed');
});
