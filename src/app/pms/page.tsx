"use client";

import React, { Suspense, useState } from "react";
import { usePmsOperations } from "@/lib/hooks/use-pms-operations";
import { PmsHeader } from "@/components/pms/frontdesk/pms-header";
import { PmsFilters } from "@/components/pms/frontdesk/pms-filters";
import { RoomGrid } from "@/components/pms/frontdesk/room-grid";
import { RoomTable } from "@/components/pms/frontdesk/room-table";
import { InHouseTable } from "@/components/pms/frontdesk/inhouse-table";
import { RegistrationsTab } from "@/components/pms/frontdesk/registrations-tab";
import { ReservationsTab } from "@/components/pms/frontdesk/reservations-tab";
import { RoomInspectDrawer } from "@/components/pms/frontdesk/room-inspect-drawer";
import { MoveRoomModal } from "@/components/pms/frontdesk/move-room-modal";
import { AddRoomModal } from "@/components/pms/frontdesk/add-room-modal";

import { PrintableGrcModal } from "@/components/pms/printable-grc";
import { GrcIntakeModal } from "@/components/pms/grc-intake-modal";
import { DigitalCheckInReviewModal } from "@/components/pms/digital-checkin-review-modal";
import { NewReservationModal } from "@/components/pms/new-reservation-modal";
import { ReservationVoucherModal } from "@/components/pms/reservation-voucher-modal";
import { CompanyDirectoryModal } from "@/components/pms/company-directory-modal";

function PMSFrontDeskContent() {
  const pms = usePmsOperations();
  const [showCompanyDirectoryModal, setShowCompanyDirectoryModal] = useState(false);
  const [quickCheckInRoom, setQuickCheckInRoom] = useState<any | null>(null);

  const handleStartQuickCheckIn = (room: any) => {
    pms.setSelectedRoomForInspect(null);
    setQuickCheckInRoom(room);
    pms.setShowGrcModal(true);
  };

  if (pms.loading && pms.rooms.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <span>Loading Front Desk PMS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto w-full">
      {/* 1. Minimal Header with Operational Metrics */}
      <PmsHeader
        propertyName={pms.activeProperty?.displayName}
        businessDate={pms.activeProperty?.businessDate}
        metrics={pms.metrics}
        onAddRoom={() => pms.setShowAddRoomModal(true)}
        onNewReservation={() => pms.setShowNewResModal(true)}
        onGrcCheckIn={() => {
          setQuickCheckInRoom(null);
          pms.setShowGrcModal(true);
        }}
      />

      {/* 2. Minimal Navigation & Filter Controls */}
      <PmsFilters
        activeTab={pms.activeTab}
        onTabChange={pms.handleTabChange}
        statusFilter={pms.statusFilter}
        onStatusFilterChange={pms.setStatusFilter}
        searchQuery={pms.searchQuery}
        onSearchChange={pms.setSearchQuery}
        floorFilter={pms.floorFilter}
        onFloorChange={pms.setFloorFilter}
        floors={pms.floors}
        roomTypeFilter={pms.roomTypeFilter}
        onRoomTypeChange={pms.setRoomTypeFilter}
        roomTypes={pms.roomTypes}
        sortBy={pms.sortBy}
        onSortByChange={pms.setSortBy}
        viewMode={pms.viewMode}
        onViewModeChange={pms.setViewMode}
        totalFilteredCount={pms.filteredRooms.length}
        inHouseCount={pms.stays.filter((s) => s.status === "IN_HOUSE").length}
        registrationsCount={
          pms.registrations.filter((r) => r.status === "PENDING_REVIEW").length
        }
        reservationsCount={pms.reservations.length}
      />

      {/* 3. Main Views */}
      {pms.activeTab === "grid" && pms.viewMode === "grid" && (
        <RoomGrid
          rooms={pms.filteredRooms}
          stays={pms.stays}
          getRoomBedInfo={pms.getRoomBedInfo}
          onSelectInspect={pms.setSelectedRoomForInspect}
          onOpenFolio={pms.handleOpenFolio}
          onOpenMoveModal={pms.handleOpenMoveModal}
          onToggleHK={pms.handleQuickHKToggle}
          onQuickCheckIn={handleStartQuickCheckIn}
          sortBy={pms.sortBy}
        />
      )}

      {pms.activeTab === "grid" && pms.viewMode === "table" && (
        <RoomTable
          rooms={pms.filteredRooms}
          stays={pms.stays}
          onSelectInspect={pms.setSelectedRoomForInspect}
          onOpenFolio={pms.handleOpenFolio}
          onOpenMoveModal={pms.handleOpenMoveModal}
          onToggleHK={pms.handleQuickHKToggle}
          onQuickCheckIn={handleStartQuickCheckIn}
        />
      )}

      {pms.activeTab === "inhouse" && (
        <InHouseTable
          stays={pms.stays}
          metrics={pms.metrics}
          onOpenFolio={pms.handleOpenFolio}
          onOpenMoveModal={pms.handleOpenMoveModal}
          onDirectCheckout={pms.handleDirectCheckout}
        />
      )}

      {pms.activeTab === "registrations" && (
        <RegistrationsTab
          registrations={pms.registrations}
          onReview={(reg) => {
            pms.setSelectedRegForReview(reg);
            pms.setShowReviewModal(true);
          }}
          onPrintGrc={(reg) => {
            pms.setSelectedRegForPrint(reg);
            pms.setShowGrcModal(true);
          }}
        />
      )}

      {pms.activeTab === "reservations" && (
        <ReservationsTab
          reservations={pms.reservations}
          onCheckIn={(res) => {
            pms.setResForCheckIn(res);
            pms.setCheckInRoomId(res.rooms?.[0]?.assignedRoomId || "");
            pms.setShowCheckInModal(true);
          }}
          onViewVoucher={(res) => {
            pms.setSelectedResForVoucher(res);
            pms.setShowVoucherModal(true);
          }}
        />
      )}

      {/* 4. Slide-Over Room Inspector */}
      {pms.selectedRoomForInspect && (
        <RoomInspectDrawer
          room={pms.selectedRoomForInspect}
          stays={pms.stays}
          registrations={pms.registrations}
          onClose={() => pms.setSelectedRoomForInspect(null)}
          onOpenFolio={pms.handleOpenFolio}
          onOpenMoveModal={pms.handleOpenMoveModal}
          onDirectCheckout={pms.handleDirectCheckout}
          onToggleHK={pms.handleQuickHKToggle}
          onPrintGrc={(reg) => {
            pms.setSelectedRegForPrint(reg);
            pms.setShowGrcModal(true);
          }}
          onQuickCheckIn={handleStartQuickCheckIn}
        />
      )}

      {/* 5. Modals */}
      {pms.showMoveModal && pms.selectedStayForMove && (
        <MoveRoomModal
          isOpen={pms.showMoveModal}
          onClose={() => pms.setShowMoveModal(false)}
          stay={pms.selectedStayForMove}
          currentRoom={pms.selectedRoomForMove}
          rooms={pms.rooms}
          onSuccess={() => {
            pms.loadData(true);
            pms.refreshData();
          }}
        />
      )}

      {pms.showAddRoomModal && (
        <AddRoomModal
          isOpen={pms.showAddRoomModal}
          onClose={() => pms.setShowAddRoomModal(false)}
          stays={pms.stays}
          rooms={pms.rooms}
          onSuccess={() => {
            pms.loadData(true);
            pms.refreshData();
          }}
        />
      )}

      {pms.showNewResModal && (
        <NewReservationModal
          isOpen={pms.showNewResModal}
          onClose={() => pms.setShowNewResModal(false)}
          rooms={pms.rooms}
          activeProperty={pms.activeProperty}
          onSuccess={() => {
            pms.loadData(true);
            pms.refreshData();
          }}
        />
      )}

      {pms.showGrcModal && (
        <GrcIntakeModal
          isOpen={pms.showGrcModal}
          onClose={() => {
            pms.setShowGrcModal(false);
            setQuickCheckInRoom(null);
            pms.setSelectedRegForPrint(null);
          }}
          rooms={pms.rooms}
          activeProperty={pms.activeProperty}
          initialRoomId={quickCheckInRoom?.id}
          initialReservation={pms.selectedRegForPrint}
          onSuccess={() => {
            pms.setShowGrcModal(false);
            setQuickCheckInRoom(null);
            pms.setSelectedRegForPrint(null);
            pms.loadData(true);
            pms.refreshData();
          }}
        />
      )}

      {pms.showReviewModal && pms.selectedRegForReview && (
        <DigitalCheckInReviewModal
          isOpen={pms.showReviewModal}
          onClose={() => {
            pms.setShowReviewModal(false);
            pms.setSelectedRegForReview(null);
          }}
          registration={pms.selectedRegForReview}
          rooms={pms.rooms}
          onFulfilled={() => {
            pms.loadData(true);
            pms.refreshData();
          }}
        />
      )}

      {pms.showVoucherModal && pms.selectedResForVoucher && (
        <ReservationVoucherModal
          isOpen={pms.showVoucherModal}
          onClose={() => {
            pms.setShowVoucherModal(false);
            pms.setSelectedResForVoucher(null);
          }}
          reservation={pms.selectedResForVoucher}
          activeProperty={pms.activeProperty}
        />
      )}

      {showCompanyDirectoryModal && (
        <CompanyDirectoryModal
          isOpen={showCompanyDirectoryModal}
          activeProperty={pms.activeProperty}
          onClose={() => setShowCompanyDirectoryModal(false)}
          onSelectForBooking={() => {
            pms.setShowNewResModal(true);
          }}
        />
      )}
    </div>
  );
}

export default function PMSPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-500 p-8 font-mono text-xs">
          Loading Hotel Front Desk PMS...
        </div>
      }
    >
      <PMSFrontDeskContent />
    </Suspense>
  );
}
