"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useHotel } from "@/lib/context/hotel-context";
import { UserManagementTab } from "@/components/admin/user-management-tab";
import styles from "@/components/admin/staff-management.module.css";

export default function StaffRolesPage() {
  const { user } = useHotel();
  if (user?.activeRole !== "ORG_OWNER") {
    return <section className={styles.workspace}>
      <div className={styles.emptyState}>
        <div><LockKeyhole size={28} aria-hidden="true" /></div>
        <h1 className="ui-page-title">Owner access required</h1>
        <p>Only an organization owner can manage staff accounts, login details and hotel access.</p>
        <Link href="/pms" className={styles.buttonSecondary}>Back to front desk</Link>
      </div>
    </section>;
  }
  return <UserManagementTab />;
}
