import { INTERESTS, MORTGAGE_INTERESTS, PRIMARY_GOALS, PROPERTY_TYPES, US_STATES } from "@/lib/constants.ts";
import type { Client } from "@/lib/types.ts";
import { Chips, Field, NumberInput, Select, TextInput, YesNo, cx } from "./ui.tsx";

export type Patch = (p: Partial<Client>) => void;
interface Props {
  client: Client;
  set: Patch;
}

const stateOptions = US_STATES.map((s) => ({ value: s.code, label: s.name }));
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
const Callout = ({ children }: { children: React.ReactNode }) => <div className="mt-4 rounded-lg bg-brand-50 px-4 py-2.5 text-xs text-brand-700">{children}</div>;

export function ContactSection({ client, set }: Props) {
  return (
    <Grid>
      <Field label="First name *">
        <TextInput value={client.firstName} onChange={(firstName) => set({ firstName })} autoFocus />
      </Field>
      <Field label="Last name">
        <TextInput value={client.lastName} onChange={(lastName) => set({ lastName })} />
      </Field>
      <Field label="Phone">
        <TextInput type="tel" value={client.phone} onChange={(phone) => set({ phone })} />
      </Field>
      <Field label="Email">
        <TextInput type="email" value={client.email} onChange={(email) => set({ email })} />
      </Field>
      <Field label="State *" hint="Drives partner licensing checks">
        <Select value={client.state} onChange={(state) => set({ state })} options={stateOptions} placeholder="Select state…" />
      </Field>
      <Field label="Age" hint={client.age != null && client.age >= 62 ? "62+ — reverse mortgage eligible" : "62+ opens reverse mortgage options"}>
        <NumberInput value={client.age} onChange={(age) => set({ age })} suffix="years" />
      </Field>
      <Field label="Credit score (approx.)" hint="Leave blank if unknown — the credit report fills it in">
        <NumberInput value={client.creditScore} onChange={(creditScore) => set({ creditScore })} />
      </Field>
      <Field label="Monthly household income">
        <NumberInput value={client.monthlyIncome} onChange={(monthlyIncome) => set({ monthlyIncome })} prefix="$" />
      </Field>
    </Grid>
  );
}

export function GoalsSection({ client, set }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs font-medium text-slate-600">What is the client&apos;s primary goal?</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRIMARY_GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => set({ primaryGoal: client.primaryGoal === g.value ? undefined : g.value })}
              className={cx(
                "rounded-lg border px-4 py-3 text-left transition",
                client.primaryGoal === g.value ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <div className="text-sm font-medium text-slate-800">{g.label}</div>
              {g.hint && <div className="text-xs text-slate-500">{g.hint}</div>}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-medium text-slate-600">Anything else they&apos;re interested in?</div>
        <Chips value={client.interests} onChange={(interests) => set({ interests })} options={INTERESTS} />
      </div>
    </div>
  );
}

export function DebtSection({ client, set }: Props) {
  return (
    <>
      <Grid>
        <Field label="Total unsecured debt (stated)" hint="Credit cards, personal loans, medical, collections">
          <NumberInput value={client.statedUnsecuredDebt} onChange={(statedUnsecuredDebt) => set({ statedUnsecuredDebt })} prefix="$" />
        </Field>
        <Field label="Any payday loans?" group>
          <YesNo value={client.hasPaydayLoans} onChange={(hasPaydayLoans) => set({ hasPaydayLoans })} />
        </Field>
        <Field label="Behind on any payments?" group>
          <YesNo value={client.behindOnPayments} onChange={(behindOnPayments) => set({ behindOnPayments })} />
        </Field>
      </Grid>
      {client.creditReport && <Callout>A credit report is on file — its enrollable debt total and payday-loan detection take priority over the stated answers.</Callout>}
    </>
  );
}

export function HomeSection({ client, set }: Props) {
  const showMortgage = client.isHomeowner || client.primaryGoal === "home_financing" || client.interests.includes("mortgage");
  return (
    <div className="space-y-6">
      <Grid>
        <Field label="Homeowner?" group>
          <YesNo value={client.isHomeowner} onChange={(isHomeowner) => set({ isHomeowner })} />
        </Field>
        {client.isHomeowner && (
          <>
            <Field label="Property type">
              <Select value={client.propertyType} onChange={(propertyType) => set({ propertyType })} options={PROPERTY_TYPES} />
            </Field>
            <Field label="Estimated home value">
              <NumberInput value={client.homeValue} onChange={(homeValue) => set({ homeValue })} prefix="$" />
            </Field>
            <Field label="Mortgage balance" hint="Enter 0 if owned free and clear">
              <NumberInput value={client.mortgageBalance} onChange={(mortgageBalance) => set({ mortgageBalance })} prefix="$" />
            </Field>
          </>
        )}
      </Grid>

      {showMortgage && (
        <div>
          <div className="mb-2 text-xs font-medium text-slate-600">Mortgage programs the client is looking for</div>
          <Chips value={client.mortgageInterests} onChange={(mortgageInterests) => set({ mortgageInterests })} options={MORTGAGE_INTERESTS} />
        </div>
      )}

      {client.isHomeowner && (
        <Grid>
          <Field label="Home already has solar?" group>
            <YesNo value={client.hasSolar} onChange={(hasSolar) => set({ hasSolar })} />
          </Field>
          {client.hasSolar === false && (
            <Field label="Monthly electric bill">
              <NumberInput value={client.monthlyEnergyBill} onChange={(monthlyEnergyBill) => set({ monthlyEnergyBill })} prefix="$" />
            </Field>
          )}
          {client.hasSolar && (
            <Field label="Wants out of solar contract / lease?" group>
              <YesNo value={client.wantsSolarExit} onChange={(wantsSolarExit) => set({ wantsSolarExit })} />
            </Field>
          )}
          <Field label="Needs HVAC repair or replacement?" group>
            <YesNo value={client.hvacNeeds} onChange={(hvacNeeds) => set({ hvacNeeds })} />
          </Field>
        </Grid>
      )}

      <Grid>
        <Field label="Owns a timeshare?" group>
          <YesNo value={client.ownsTimeshare} onChange={(ownsTimeshare) => set({ ownsTimeshare })} />
        </Field>
        {client.ownsTimeshare && (
          <Field label="Wants to exit the timeshare?" group>
            <YesNo value={client.wantsTimeshareExit} onChange={(wantsTimeshareExit) => set({ wantsTimeshareExit })} />
          </Field>
        )}
      </Grid>
    </div>
  );
}

export function BusinessSection({ client, set }: Props) {
  const tib = client.timeInBusinessMonths;
  return (
    <div className="space-y-6">
      <Grid>
        <Field label="Business owner?" hint="Unlocks bank-statement loans and business funding" group>
          <YesNo value={client.isBusinessOwner} onChange={(isBusinessOwner) => set({ isBusinessOwner })} />
        </Field>
      </Grid>
      {client.isBusinessOwner && (
        <>
          <Grid>
            <Field label="Business name">
              <TextInput value={client.businessName} onChange={(businessName) => set({ businessName })} />
            </Field>
            <Field label="Industry">
              <TextInput value={client.industry} onChange={(industry) => set({ industry })} placeholder="e.g. Trucking, Restaurant" />
            </Field>
            <Field label="Monthly business revenue">
              <NumberInput value={client.monthlyBusinessRevenue} onChange={(monthlyBusinessRevenue) => set({ monthlyBusinessRevenue })} prefix="$" />
            </Field>
            <Field label="Time in business" hint={tib != null ? `${Math.floor(tib / 12)} yr ${tib % 12} mo` : "In months (24 = 2 years)"}>
              <NumberInput value={tib} onChange={(timeInBusinessMonths) => set({ timeInBusinessMonths })} suffix="months" />
            </Field>
            <Field label="Business debt outstanding" hint="MCAs, business loans, business cards">
              <NumberInput value={client.businessDebt} onChange={(businessDebt) => set({ businessDebt })} prefix="$" />
            </Field>
            <Field label="Funding amount needed">
              <NumberInput value={client.fundingAmountNeeded} onChange={(fundingAmountNeeded) => set({ fundingAmountNeeded })} prefix="$" />
            </Field>
          </Grid>
          <Grid>
            <Field label="Struggling to keep up with business debt?" group>
              <YesNo value={client.behindOnBusinessDebt} onChange={(behindOnBusinessDebt) => set({ behindOnBusinessDebt })} />
            </Field>
            <Field label="Urgent need for funds?" group>
              <YesNo value={client.urgentFunding} onChange={(urgentFunding) => set({ urgentFunding })} />
            </Field>
            <Field label="Needs to finance equipment?" group>
              <YesNo value={client.needsEquipment} onChange={(needsEquipment) => set({ needsEquipment })} />
            </Field>
            <Field label="Accepts card payments?" group>
              <YesNo value={client.acceptsCards} onChange={(acceptsCards) => set({ acceptsCards })} />
            </Field>
            {client.acceptsCards && (
              <Field label="Monthly card volume">
                <NumberInput value={client.monthlyCardVolume} onChange={(monthlyCardVolume) => set({ monthlyCardVolume })} prefix="$" />
              </Field>
            )}
          </Grid>
        </>
      )}
    </div>
  );
}

/** Inline answer control for a missing fact (used by the "questions to ask" list). */
export function FactQuestion({ fieldKey, client, set }: { fieldKey: string; client: Client; set: Patch }) {
  switch (fieldKey) {
    case "state":
      return <Select value={client.state} onChange={(state) => set({ state })} options={stateOptions} />;
    case "primaryGoal":
      return <Select value={client.primaryGoal} onChange={(primaryGoal) => set({ primaryGoal })} options={PRIMARY_GOALS} />;
    case "propertyType":
      return <Select value={client.propertyType} onChange={(propertyType) => set({ propertyType })} options={PROPERTY_TYPES} />;
    case "mortgageInterests":
      return <Chips value={client.mortgageInterests} onChange={(mortgageInterests) => set({ mortgageInterests })} options={MORTGAGE_INTERESTS} />;
    case "unsecuredDebt":
      return <NumberInput value={client.statedUnsecuredDebt} onChange={(statedUnsecuredDebt) => set({ statedUnsecuredDebt })} prefix="$" />;
    case "homeEquity":
    case "ltv":
    case "mortgageBalance":
    case "homeValue":
      return (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput value={client.homeValue} onChange={(homeValue) => set({ homeValue })} prefix="$" placeholder="Home value" />
          <NumberInput value={client.mortgageBalance} onChange={(mortgageBalance) => set({ mortgageBalance })} prefix="$" placeholder="Mortgage owed" />
        </div>
      );
    default: {
      const key = fieldKey as keyof Client;
      const current = client[key];
      const boolKeys = ["hasPaydayLoans", "behindOnPayments", "isHomeowner", "hasSolar", "wantsSolarExit", "hvacNeeds", "ownsTimeshare", "wantsTimeshareExit", "isBusinessOwner", "behindOnBusinessDebt", "urgentFunding", "needsEquipment", "acceptsCards"];
      if (boolKeys.includes(fieldKey)) return <YesNo value={current as boolean | undefined} onChange={(v) => set({ [key]: v } as Partial<Client>)} />;
      const money = ["monthlyIncome", "monthlyEnergyBill", "monthlyBusinessRevenue", "businessDebt", "fundingAmountNeeded", "monthlyCardVolume"].includes(fieldKey);
      return <NumberInput value={current as number | undefined} onChange={(v) => set({ [key]: v } as Partial<Client>)} prefix={money ? "$" : undefined} suffix={fieldKey === "timeInBusinessMonths" ? "months" : fieldKey === "age" ? "years" : undefined} />;
    }
  }
}
