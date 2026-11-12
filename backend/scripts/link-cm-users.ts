/**
 * One-time script: link CommunityMember records to their User accounts
 * by matching on name/email similarity.
 *
 * Run: npx tsx scripts/link-cm-users.ts
 */
import { prisma } from "../src/database/prismaClient.js";

async function main() {
  // Explicit mappings: communityMemberId → userId
  const links: { memberId: string; userId: string; name: string }[] = [
    // "Notification Test Member" (member) ← test-cm-notif@otcms.local (user)
    {
      memberId: "01a1c6e3-0e27-7a91-8ed2-74465ad5d387",
      userId:   "01a1c6e3-0a34-7c00-a6eb-2a0c8324ea1f",
      name: "Notification Test Member",
    },
    // "Jarso Boru" does not have a matching CommunityMember record — skip.
    // Add more mappings here as new accounts are linked.
  ];

  for (const link of links) {
    // Verify no other member already has this userId
    const existing = await prisma.communityMember.findUnique({ where: { userId: link.userId } });
    if (existing && existing.id !== link.memberId) {
      console.warn(`SKIP ${link.name}: userId ${link.userId} already assigned to ${existing.fullName}`);
      continue;
    }

    await prisma.communityMember.update({
      where: { id: link.memberId },
      data:  { userId: link.userId },
    });
    console.log(`LINKED: ${link.name} → userId ${link.userId}`);
  }

  // Also create a CommunityMember record for "Jarso Boru" (community@gmail.com)
  // who has a user account but no member record
  const jarsoBoru = await prisma.user.findUnique({ where: { email: "community@gmail.com" } });
  if (jarsoBoru) {
    const existing = await prisma.communityMember.findUnique({ where: { userId: jarsoBoru.id } });
    if (!existing) {
      const created = await prisma.communityMember.create({
        data: {
          userId:   jarsoBoru.id,
          fullName: jarsoBoru.fullName,
          phone:    jarsoBoru.phone ?? undefined,
          verificationStatus: "VERIFIED",
        },
      });
      console.log(`CREATED CommunityMember for Jarso Boru: ${created.id}`);
    } else {
      console.log(`Jarso Boru already has a CommunityMember record: ${existing.id}`);
    }
  }

  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
