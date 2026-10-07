import {MemberProfilePanel} from '@/components/members/member-profile';
export const dynamic='force-dynamic';
export default async function MemberPage({params}:{params:Promise<{username:string}>}){const{username}=await params;return <MemberProfilePanel username={username}/>;}
