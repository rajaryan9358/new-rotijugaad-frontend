import React, { useState } from 'react';

const initialState = {
	lastSeenFrom: '',
	lastSeenTo: '',
	includeNullLastSeen: false,
	mode: 'set',
	contactCredits: '',
	interestCredits: '',
	adCredits: '',
	expiryDate: '',
	reason: '',
};

/**
 * Reusable "Bulk Credits" dialog for Employees/Employers management pages.
 * Purely presentational + orchestration — the parent page owns the actual
 * API calls (preview count / grant / export) since it already has the
 * permission checks, export formatting, and api modules for that entity.
 */
export default function BulkCreditsDialog({
	open,
	title,
	showAdsCredit = false,
	onClose,
	onPreviewCount,
	onGrant,
	onExport,
}) {
	const [form, setForm] = useState(initialState);
	const [confirming, setConfirming] = useState(false);
	const [previewCount, setPreviewCount] = useState(null);
	const [countLoading, setCountLoading] = useState(false);
	const [granting, setGranting] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState(null);
	const [resultMessage, setResultMessage] = useState(null);

	if (!open) return null;

	const set = (patch) => {
		setForm((f) => ({ ...f, ...patch }));
		// Any field change invalidates a pending confirmation (the matched count
		// or the credits being applied may no longer match what was previewed).
		setConfirming(false);
		setPreviewCount(null);
	};

	const buildFilters = () => ({
		lastSeenFrom: form.lastSeenFrom || undefined,
		lastSeenTo: form.lastSeenTo || undefined,
		includeNullLastSeen: form.includeNullLastSeen || undefined,
	});

	const validate = () => {
		const hasCredit = form.contactCredits !== '' || form.interestCredits !== '' || (showAdsCredit && form.adCredits !== '');
		if (!hasCredit && !form.expiryDate) {
			return 'Provide at least one credit field or an expiry date.';
		}
		if (!form.reason.trim()) {
			return 'Reason is required.';
		}
		return null;
	};

	const buildPayload = () => ({
		mode: form.mode,
		contact_credits: form.contactCredits === '' ? undefined : form.contactCredits,
		interest_credits: form.interestCredits === '' ? undefined : form.interestCredits,
		...(showAdsCredit ? { ad_credits: form.adCredits === '' ? undefined : form.adCredits } : {}),
		credit_expiry_at: form.expiryDate || undefined,
		reason: form.reason.trim(),
	});

	const handleGrantClick = async () => {
		const validationError = validate();
		if (validationError) {
			setError(validationError);
			return;
		}
		setError(null);

		if (!confirming) {
			setCountLoading(true);
			try {
				const count = await onPreviewCount(buildFilters());
				setPreviewCount(count);
				setConfirming(true);
			} catch (e) {
				setError(e?.response?.data?.message || e?.message || 'Failed to preview matching count.');
			} finally {
				setCountLoading(false);
			}
			return;
		}

		setGranting(true);
		setResultMessage(null);
		try {
			const result = await onGrant(buildFilters(), buildPayload());
			setResultMessage({ type: 'success', text: `Updated ${result?.updatedCount ?? 0} record(s).` });
			setConfirming(false);
			setPreviewCount(null);
		} catch (e) {
			setResultMessage({ type: 'error', text: e?.response?.data?.message || e?.message || 'Failed to grant credits.' });
		} finally {
			setGranting(false);
		}
	};

	const handleExportClick = async () => {
		setExporting(true);
		setResultMessage(null);
		try {
			await onExport(buildFilters());
		} catch (e) {
			setResultMessage({ type: 'error', text: e?.response?.data?.message || e?.message || 'Failed to export.' });
		} finally {
			setExporting(false);
		}
	};

	const handleClose = () => {
		setForm(initialState);
		setConfirming(false);
		setPreviewCount(null);
		setError(null);
		setResultMessage(null);
		onClose();
	};

	const busy = granting || exporting || countLoading;

	return (
		<div className="form-container" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			<div style={{ width: '92%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '8px', padding: '20px' }}>
				<h2 style={{ marginTop: 0 }}>{title}</h2>

				{error && <div className="error-message">{error}</div>}
				{resultMessage && (
					<div className={resultMessage.type === 'error' ? 'error-message' : 'success-message'} style={resultMessage.type === 'success' ? { color: '#15803d', marginBottom: '12px' } : undefined}>
						{resultMessage.text}
					</div>
				)}

				<h4 style={{ margin: '4px 0 8px' }}>Filter by last seen</h4>
				<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
					<div className="form-group" style={{ flex: '1 1 160px' }}>
						<label>Last Seen From</label>
						<input type="date" value={form.lastSeenFrom} onChange={(e) => set({ lastSeenFrom: e.target.value })} disabled={busy} />
					</div>
					<div className="form-group" style={{ flex: '1 1 160px' }}>
						<label>Last Seen To</label>
						<input type="date" value={form.lastSeenTo} onChange={(e) => set({ lastSeenTo: e.target.value })} disabled={busy} />
					</div>
				</div>
				<div className="form-group">
					<label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'normal' }}>
						<input
							type="checkbox"
							checked={form.includeNullLastSeen}
							onChange={(e) => set({ includeNullLastSeen: e.target.checked })}
							disabled={busy}
						/>
						Include records with no last seen value
					</label>
				</div>

				<h4 style={{ margin: '16px 0 8px' }}>Credits to grant</h4>
				<div className="form-group">
					<label>Apply as</label>
					<select value={form.mode} onChange={(e) => set({ mode: e.target.value })} disabled={busy}>
						<option value="set">Set (overwrite with entered value)</option>
						<option value="increment">Increment (add to current balance)</option>
					</select>
				</div>
				<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
					<div className="form-group" style={{ flex: '1 1 140px' }}>
						<label>Contact Credits</label>
						<input type="number" min="0" value={form.contactCredits} onChange={(e) => set({ contactCredits: e.target.value })} placeholder="Leave blank to skip" disabled={busy} />
					</div>
					<div className="form-group" style={{ flex: '1 1 140px' }}>
						<label>Interest Credits</label>
						<input type="number" min="0" value={form.interestCredits} onChange={(e) => set({ interestCredits: e.target.value })} placeholder="Leave blank to skip" disabled={busy} />
					</div>
					{showAdsCredit && (
						<div className="form-group" style={{ flex: '1 1 140px' }}>
							<label>Ads Credits</label>
							<input type="number" min="0" value={form.adCredits} onChange={(e) => set({ adCredits: e.target.value })} placeholder="Leave blank to skip" disabled={busy} />
						</div>
					)}
				</div>
				<div className="form-group">
					<label>Credit Expiry Date</label>
					<input type="date" value={form.expiryDate} onChange={(e) => set({ expiryDate: e.target.value })} disabled={busy} />
					<small style={{ display: 'block', color: '#6b7280', marginTop: '4px' }}>Leave blank to keep each record's current expiry.</small>
				</div>
				<div className="form-group">
					<label>Reason *</label>
					<textarea
						rows={2}
						value={form.reason}
						onChange={(e) => set({ reason: e.target.value })}
						placeholder="Why are you granting these credits?"
						disabled={busy}
					/>
				</div>

				{confirming && previewCount !== null && (
					<div style={{ margin: '8px 0', padding: '10px', background: '#fef3c7', borderRadius: '6px', fontSize: '14px' }}>
						This will update <strong>{previewCount}</strong> matching record(s). Click Grant Credit again to confirm.
					</div>
				)}

				<div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
					<div style={{ display: 'flex', gap: '8px' }}>
						<button className="btn-secondary" onClick={handleExportClick} disabled={busy}>
							{exporting ? 'Exporting...' : 'Export'}
						</button>
						<button className="btn-secondary" onClick={handleClose} disabled={busy}>Close</button>
					</div>
					<button className="btn-primary" onClick={handleGrantClick} disabled={busy}>
						{countLoading ? 'Checking matches...' : granting ? 'Granting...' : confirming ? `Confirm Grant (${previewCount ?? '...'})` : 'Grant Credit'}
					</button>
				</div>
			</div>
		</div>
	);
}
