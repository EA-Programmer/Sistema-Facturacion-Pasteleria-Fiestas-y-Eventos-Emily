--
-- PostgreSQL database dump
--

\restrict qzXmcjyJCQbOzXvu2gebgzRbyaV3hvZm0Mos8613qA61cNjmE10RKslmag4SLPk

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-22 08:42:51

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 879 (class 1247 OID 16444)
-- Name: DocumentType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DocumentType" AS ENUM (
    'CEDULA',
    'RUC',
    'PASAPORTE',
    'CONSUMIDOR_FINAL'
);


ALTER TYPE public."DocumentType" OWNER TO postgres;

--
-- TOC entry 891 (class 1247 OID 16492)
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'BORRADOR',
    'EMITIDA',
    'ENVIADA',
    'AUTORIZADA',
    'ANULADA',
    'GENERADA_XML',
    'FIRMADA',
    'ENVIADA_SRI',
    'RECIBIDA',
    'DEVUELTA',
    'NO_AUTORIZADA',
    'ERROR_CONEXION'
);


ALTER TYPE public."InvoiceStatus" OWNER TO postgres;

--
-- TOC entry 888 (class 1247 OID 16478)
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'BORRADOR',
    'CONFIRMADO',
    'EN_PRODUCCION',
    'LISTO',
    'ENTREGADO',
    'CANCELADO'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- TOC entry 897 (class 1247 OID 16512)
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'EFECTIVO',
    'TRANSFERENCIA',
    'DEPOSITO',
    'TARJETA',
    'OTRO'
);


ALTER TYPE public."PaymentMethod" OWNER TO postgres;

--
-- TOC entry 894 (class 1247 OID 16504)
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDIENTE',
    'CONFIRMADO',
    'ANULADO'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- TOC entry 885 (class 1247 OID 16472)
-- Name: PricingMode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PricingMode" AS ENUM (
    'FIJO',
    'POR_REGLAS'
);


ALTER TYPE public."PricingMode" OWNER TO postgres;

--
-- TOC entry 882 (class 1247 OID 16454)
-- Name: ProductCategory; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProductCategory" AS ENUM (
    'TORTAS',
    'BOCADITOS_SAL',
    'BOCADITOS_DULCE',
    'CUPCAKES',
    'GALLETAS',
    'POSTRES',
    'VELAS',
    'EXTRAS'
);


ALTER TYPE public."ProductCategory" OWNER TO postgres;

--
-- TOC entry 876 (class 1247 OID 16438)
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'STAFF'
);


ALTER TYPE public."Role" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 16537)
-- Name: Account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public."Account" OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16793)
-- Name: BusinessSettings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BusinessSettings" (
    id text NOT NULL,
    "businessName" text NOT NULL,
    "tradeName" text,
    ruc text NOT NULL,
    address text NOT NULL,
    city text,
    province text,
    phone text,
    email text,
    "logoPath" text,
    "establishmentCode" text DEFAULT '001'::text NOT NULL,
    "emissionPointCode" text DEFAULT '001'::text NOT NULL,
    "invoiceSequence" integer DEFAULT 1 NOT NULL,
    "taxRate" numeric(5,2) DEFAULT 15 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "emailFromName" text,
    "emailFromAddress" text,
    "emailReplyTo" text,
    "sriEnvironment" text DEFAULT 'PRUEBAS'::text NOT NULL,
    "sriEnabled" boolean DEFAULT false NOT NULL,
    "signatureExpiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "signatureFileName" text,
    "signatureFilePath" text,
    "signaturePassword" text,
    "signatureRegisteredAt" timestamp(3) without time zone
);


ALTER TABLE public."BusinessSettings" OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16674)
-- Name: CakeCover; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CakeCover" (
    id text NOT NULL,
    name text NOT NULL,
    "extraPrice" numeric(10,2) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CakeCover" OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16658)
-- Name: CakeFilling; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CakeFilling" (
    id text NOT NULL,
    name text NOT NULL,
    "extraPrice" numeric(10,2) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CakeFilling" OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16642)
-- Name: CakeFlavor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CakeFlavor" (
    id text NOT NULL,
    name text NOT NULL,
    specialty boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CakeFlavor" OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16690)
-- Name: CakeModel; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CakeModel" (
    id text NOT NULL,
    name text NOT NULL,
    customizable boolean DEFAULT true NOT NULL,
    "extraPrice" numeric(10,2) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CakeModel" OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16627)
-- Name: CakePortion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CakePortion" (
    id text NOT NULL,
    portions integer NOT NULL,
    price numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CakePortion" OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16568)
-- Name: Customer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    name text NOT NULL,
    "documentType" public."DocumentType" DEFAULT 'CEDULA'::public."DocumentType" NOT NULL,
    document text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    province text,
    notes text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Customer" OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16758)
-- Name: Invoice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    number text NOT NULL,
    "orderId" text NOT NULL,
    "customerId" text NOT NULL,
    status public."InvoiceStatus" DEFAULT 'BORRADOR'::public."InvoiceStatus" NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    tax numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    "pdfUrl" text,
    "sriAccessKey" text,
    "sriXmlUrl" text,
    "sriRideUrl" text,
    "sriAuthorizedAt" timestamp(3) without time zone,
    "issuedAt" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Invoice" OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 18709)
-- Name: InvoiceEmailLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InvoiceEmailLog" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "to" text NOT NULL,
    "from" text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'SIMULADO'::text NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."InvoiceEmailLog" OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16725)
-- Name: Order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    code text NOT NULL,
    "customerId" text NOT NULL,
    status public."OrderStatus" DEFAULT 'BORRADOR'::public."OrderStatus" NOT NULL,
    "deliveryDate" timestamp(3) without time zone,
    "deliveryTime" text,
    "deliveryAddress" text,
    dedication text,
    "referenceImageNote" text,
    notes text,
    subtotal numeric(10,2) NOT NULL,
    tax numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Order" OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16745)
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text,
    name text NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    customization jsonb
);


ALTER TABLE public."OrderItem" OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16777)
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "invoiceId" text,
    method public."PaymentMethod" NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDIENTE'::public."PaymentStatus" NOT NULL,
    amount numeric(10,2) NOT NULL,
    reference text,
    notes text,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16708)
-- Name: PricingRule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PricingRule" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    "appliesTo" text NOT NULL,
    conditions jsonb NOT NULL,
    calculation jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PricingRule" OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16585)
-- Name: Product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    category public."ProductCategory" NOT NULL,
    "basePrice" numeric(10,2) NOT NULL,
    "pricingMode" public."PricingMode" DEFAULT 'FIJO'::public."PricingMode" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16614)
-- Name: ProductOption; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductOption" (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    "values" jsonb
);


ALTER TABLE public."ProductOption" OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16603)
-- Name: ProductVariant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductVariant" (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    metadata jsonb
);


ALTER TABLE public."ProductVariant" OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16549)
-- Name: Session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Session" OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 25587)
-- Name: SriJob; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SriJob" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    status text DEFAULT 'PENDIENTE'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "lastError" text,
    "nextRunAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lockedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SriJob" OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16523)
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    image text,
    role public."Role" DEFAULT 'ADMIN'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "passwordHash" text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16560)
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VerificationToken" OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16423)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- TOC entry 5235 (class 0 OID 16537)
-- Dependencies: 221
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- TOC entry 5252 (class 0 OID 16793)
-- Dependencies: 238
-- Data for Name: BusinessSettings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BusinessSettings" (id, "businessName", "tradeName", ruc, address, city, province, phone, email, "logoPath", "establishmentCode", "emissionPointCode", "invoiceSequence", "taxRate", currency, "emailFromName", "emailFromAddress", "emailReplyTo", "sriEnvironment", "sriEnabled", "signatureExpiresAt", "createdAt", "updatedAt", "signatureFileName", "signatureFilePath", "signaturePassword", "signatureRegisteredAt") FROM stdin;
default	JIMENEZ CONTRERAS SAIDA LOURDES	Fiestas & Eventos Emily	0703016147001	Callejón Zaruma entre Napoleón Mera y Buenavista	Machala	El Oro	0990651735	saydilourdesjc@gmail.com	/brand/logo-emily.png	001	001	9	0.00	USD	Fiestas & Eventos Emily	saydilourdesjc@gmail.com	saydilourdesjc@gmail.com	PRODUCCION	t	2027-05-21 05:00:00	2026-05-18 17:38:46.944	2026-05-21 22:46:37.992	SAIDA LOURDES JIMENEZ CONTRERAS 0703016147-210526115101.p12	C:\\Users\\USER\\Desktop\\FACTURACION PASTELERIA\\storage\\sri\\signatures\\0703016147001-1779402416196-0fe9214e6acb.p12	2EDliRMQwgz77S2r:daFPKc06/+kvBeTi6rQzzw==:sbyIgnni9rhUFQ==	2026-05-21 22:26:56.269
\.


--
-- TOC entry 5245 (class 0 OID 16674)
-- Dependencies: 231
-- Data for Name: CakeCover; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CakeCover" (id, name, "extraPrice", active, "createdAt", "updatedAt") FROM stdin;
cmpbhn33k000fvzo4dy8ji2zs	Chantilly	0.00	t	2026-05-18 17:38:47.025	2026-05-19 17:00:43.155
cmpbhn33o000gvzo4vd0xu5mh	Mantequilla	2.00	t	2026-05-18 17:38:47.028	2026-05-19 17:00:43.156
\.


--
-- TOC entry 5244 (class 0 OID 16658)
-- Dependencies: 230
-- Data for Name: CakeFilling; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CakeFilling" (id, name, "extraPrice", active, "createdAt", "updatedAt") FROM stdin;
cmpbhn33f000cvzo4oe3im96a	Crema de avellana	3.00	t	2026-05-21 22:37:53.055	2026-05-21 22:37:53.055
cmpbhn33h000dvzo4c7grxa8k	Crema pastelera	1.50	t	2026-05-21 22:37:53.055	2026-05-21 22:37:53.055
cmpbhn33a000bvzo4w391suvg	Manjar	0.00	t	2026-05-21 22:37:53.055	2026-05-21 22:37:53.055
cmpbhn33j000evzo4w2r96r2y	Mermelada de frutas	1.50	t	2026-05-21 22:37:53.055	2026-05-21 22:37:53.055
\.


--
-- TOC entry 5243 (class 0 OID 16642)
-- Dependencies: 229
-- Data for Name: CakeFlavor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CakeFlavor" (id, name, specialty, active, "createdAt", "updatedAt") FROM stdin;
cmpbhn3310006vzo4r7co3f2i	Chocolate	f	t	2026-05-21 22:36:28.294	2026-05-21 22:36:28.294
cmpbhn338000avzo4go002emj	Frutos secos	t	t	2026-05-21 22:36:28.294	2026-05-21 22:36:28.294
flavor-1779402988132-y74z4	Marmoleado	f	t	2026-05-21 22:36:28.294	2026-05-21 22:36:28.294
cmpbhn3340007vzo4dg3yr8j3	Mixta	f	t	2026-05-21 22:36:28.294	2026-05-21 22:36:28.294
cmpbhn3370009vzo4dvzn2jii	Oreo	f	t	2026-05-21 22:36:28.294	2026-05-21 22:36:28.294
cmpbhn32x0005vzo47qw764t9	Vainilla	f	t	2026-05-21 22:36:28.294	2026-05-21 22:36:28.294
cmpbhn3350008vzo4e6jovqj0	Zanahoria	f	t	2026-05-21 22:36:28.294	2026-05-21 22:36:28.294
\.


--
-- TOC entry 5246 (class 0 OID 16690)
-- Dependencies: 232
-- Data for Name: CakeModel; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CakeModel" (id, name, customizable, "extraPrice", active, "createdAt", "updatedAt") FROM stdin;
cmpbhn33p000hvzo42polck7r	Modelo personalizado	t	0.00	t	2026-05-18 17:38:47.03	2026-05-19 17:00:43.156
cmpbhn33s000ivzo45sg88h4u	Modelo tematico	t	5.00	t	2026-05-18 17:38:47.033	2026-05-19 17:00:43.157
cmpbhn33u000jvzo4fhh1cde5	Modelo para eventos	t	8.00	t	2026-05-18 17:38:47.035	2026-05-19 17:00:43.158
\.


--
-- TOC entry 5242 (class 0 OID 16627)
-- Dependencies: 228
-- Data for Name: CakePortion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CakePortion" (id, portions, price, active, "createdAt", "updatedAt") FROM stdin;
cmpbhn32o0000vzo49wv5fs1e	8	10.00	t	2026-05-21 21:54:48.515	2026-05-21 21:54:48.515
cmpbhn32r0001vzo4gjkxs3cr	10	15.00	t	2026-05-21 21:54:48.515	2026-05-21 21:54:48.515
cmpbhn32t0002vzo445u32xlg	15	20.00	t	2026-05-21 21:54:48.515	2026-05-21 21:54:48.515
cmpbhn32u0003vzo4x0o8nz28	20	25.00	t	2026-05-21 21:54:48.515	2026-05-21 21:54:48.515
cmpbhn32w0004vzo48x7yn0f0	25	30.00	t	2026-05-21 21:54:48.515	2026-05-21 21:54:48.515
\.


--
-- TOC entry 5238 (class 0 OID 16568)
-- Dependencies: 224
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Customer" (id, name, "documentType", document, email, phone, address, city, province, notes, active, "createdAt", "updatedAt") FROM stdin;
customer-final	Consumidor final	CONSUMIDOR_FINAL	9999999999999	\N	\N	Sin direccion	\N	\N	Cliente generico para ventas sin datos de facturacion.	t	2026-05-18 17:38:47.036	2026-05-18 17:38:47.036
customer-1779391261694-iscy0	Kristhel Estefania Zapata Aguirre	CEDULA	0706276466	kristhelzapata31@gmail.com	0980031007	Urb. Ciudad del Sol	Machala	El Oro	\N	t	2026-05-21 19:21:01.835	2026-05-21 19:21:01.835
customer-1779402905683-iq2jq	Merle Azucena León Borja	CEDULA	0703249110	mleon542414@gmail.com	0987456714	Machala, Ciudadela Las Brisas	Machala	El Oro	\N	t	2026-05-21 22:35:05.825	2026-05-21 22:35:05.825
customer-1779403459920-jqqze	Joofre Honores Tapia	CEDULA	0704811751	joofrehonores@gmail.com	0958939618	Machala	Machala	El Oro	\N	t	2026-05-21 22:44:19.977	2026-05-21 22:44:19.977
customer-1779385145229-bxliv	Elías Joel Astudillo Jiménez	CEDULA	0707043295	eastudillojimenez@gmail.com	0994888261	Napoleón Mera y Callejón Zaruma	Machala	El Oro	\N	t	2026-05-21 17:39:05.355	2026-05-22 03:10:12.427
\.


--
-- TOC entry 5250 (class 0 OID 16758)
-- Dependencies: 236
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Invoice" (id, number, "orderId", "customerId", status, subtotal, tax, total, "pdfUrl", "sriAccessKey", "sriXmlUrl", "sriRideUrl", "sriAuthorizedAt", "issuedAt", "sentAt", "createdAt", "updatedAt") FROM stdin;
cmpfs0a0d0003vzf83mbd7a8u	001-001-000000001	order-1779385174276-m3hmr	customer-1779385145229-bxliv	ENVIADA	11.50	1.73	13.23	\N	\N	\N	\N	\N	2026-05-21 17:40:21.302	2026-05-21 17:40:21.243	2026-05-21 17:40:03.373	2026-05-21 17:40:21.304
cmpft0m790003vzuwd7esahcu	001-001-000000002	order-1779386876293-bjx5b	customer-1779385145229-bxliv	ENVIADA	20.00	3.00	23.00	\N	\N	\N	\N	\N	2026-05-21 18:30:45.336	2026-05-21 18:30:45.311	2026-05-21 18:08:18.789	2026-05-21 18:30:45.339
cmpfvox2k0009vzuwvs0f6uyo	001-001-000000003	order-1779391351280-suqqz	customer-1779391261694-iscy0	ENVIADA	17.00	2.55	19.55	\N	\N	\N	\N	\N	2026-05-21 19:25:20.801	2026-05-21 19:25:20.797	2026-05-21 19:23:11.852	2026-05-21 19:25:20.802
cmpg07xv50005vzf8dvk4ndti	001-001-000000004	order-1779398857925-ehi6h	customer-1779391261694-iscy0	ENVIADA	17.00	0.00	17.00	\N	\N	\N	\N	\N	2026-05-21 21:30:38.884	2026-05-21 21:30:38.853	2026-05-21 21:29:57.809	2026-05-21 21:30:38.886
cmpg168h30003vzpwayaamy36	001-001-000000005	order-1779400578411-pzl8e	customer-1779385145229-bxliv	ENVIADA	10.00	0.00	10.00	\N	\N	\N	\N	\N	2026-05-21 21:58:41.622	2026-05-21 21:58:41.567	2026-05-21 21:56:37.863	2026-05-21 21:58:41.624
cmpg1w5gd0009vzpwk27oq1au	001-001-000000006	order-1779401785213-wyn1a	customer-1779385145229-bxliv	ENVIADA	10.00	0.00	10.00	\N	2105202601070301614700120010010000000062850584815	C:\\Users\\USER\\Desktop\\FACTURACION PASTELERIA\\storage\\sri\\xml\\001001000000006.xml	\N	\N	2026-05-21 22:27:48.375	2026-05-21 22:27:48.368	2026-05-21 22:16:47.006	2026-05-21 22:27:48.377
cmpg2slkx0009vzaoj98lxcgn	001-001-000000007	order-1779403304813-8bk9v	customer-1779402905683-iq2jq	ENVIADA	58.00	0.00	58.00	\N	2105202601070301614700120010010000000075970880714	C:\\Users\\USER\\Desktop\\FACTURACION PASTELERIA\\storage\\sri\\xml\\001001000000007.xml	\N	\N	2026-05-21 22:42:29.018	2026-05-21 22:42:28.985	2026-05-21 22:42:00.897	2026-05-21 22:42:29.022
cmpg2yjdx000jvzaozr4sxglp	001-001-000000008	order-1779403557720-vn8zo	customer-1779403459920-jqqze	ENVIADA	20.00	0.00	20.00	\N	2105202601070301614700120010010000000080214054014	C:\\Users\\USER\\Desktop\\FACTURACION PASTELERIA\\storage\\sri\\xml\\001001000000008.xml	\N	\N	2026-05-21 22:47:03.08	2026-05-21 22:47:03.051	2026-05-21 22:46:37.99	2026-05-21 22:47:03.082
\.


--
-- TOC entry 5253 (class 0 OID 18709)
-- Dependencies: 239
-- Data for Name: InvoiceEmailLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InvoiceEmailLog" (id, "invoiceId", "invoiceNumber", "to", "from", subject, body, status, "sentAt", "createdAt") FROM stdin;
cmpfs0nu80005vzf8epy0lz8z	cmpfs0a0d0003vzf83mbd7a8u	001-001-000000001	eastudillojimenez@gmail.com	Fiestas & Eventos Emily <pendiente@emily.local>	Factura 001-001-000000001 - Emily	Hola Elias Astudillo,\nAdjuntamos la factura 001-001-000000001 correspondiente a tu pedido PED-0001.\nTotal: $13,23\nEstado: Pendiente\nGracias por tu compra.\nEmily	SIMULADO	2026-05-21 17:40:21.243	2026-05-21 17:40:21.297
cmpftth6v0005vzuwm9pqznot	cmpft0m790003vzuwd7esahcu	001-001-000000002	eastudillojimenez@gmail.com	Fiestas & Eventos Emily <noreply@smartmenucloud.com>	Factura 001-001-000000002 - Emily	Hola Elias Astudillo,\nAdjuntamos la factura 001-001-000000002 correspondiente a tu pedido PED-0002.\nTotal: $23,00\nEstado: Pendiente\nGracias por tu compra.\nEmily	ENVIADO	2026-05-21 18:30:45.311	2026-05-21 18:30:45.316
cmpfvrc05000bvzuwm0id2y2z	cmpfvox2k0009vzuwvs0f6uyo	001-001-000000003	kristhelzapata31@gmail.com	Fiestas & Eventos Emily <saydilourdesjc@gmail.com>	Factura 001-001-000000003 - Fiestas & Eventos Emily	Hola Kristhel Estefania Zapata Aguirre,\nAdjuntamos la factura 001-001-000000003 correspondiente a tu pedido PED-0003.\nTotal: $19,55\nEstado: Pendiente\nGracias por tu compra.\nFiestas & Eventos Emily\nTelefono: 0990651735	ENVIADO	2026-05-21 19:25:04.513	2026-05-21 19:25:04.516
cmpfvroke000dvzuw4y11llbj	cmpfvox2k0009vzuwvs0f6uyo	001-001-000000003	kristhelzapata31@gmail.com	Fiestas & Eventos Emily <saydilourdesjc@gmail.com>	Factura 001-001-000000003 - Fiestas & Eventos Emily	Hola Kristhel Estefania Zapata Aguirre,\nAdjuntamos la factura 001-001-000000003 correspondiente a tu pedido PED-0003.\nTotal: $19,55\nEstado: Pendiente\nGracias por tu compra.\nFiestas & Eventos Emily\nTelefono: 0990651735	ENVIADO	2026-05-21 19:25:20.797	2026-05-21 19:25:20.798
cmpg08tjc0007vzf8cww65p3m	cmpg07xv50005vzf8dvk4ndti	001-001-000000004	kristhelzapata31@gmail.com	Fiestas & Eventos Emily <saydilourdesjc@gmail.com>	Factura 001-001-000000004 - Fiestas & Eventos Emily	Hola Kristhel Estefania Zapata Aguirre,\nAdjuntamos la factura 001-001-000000004 correspondiente a tu pedido PED-0004.\nTotal: $17,00\nEstado: Pendiente\nGracias por tu compra.\nFiestas & Eventos Emily\nTelefono: 0990651735	ENVIADO	2026-05-21 21:30:38.853	2026-05-21 21:30:38.856
cmpg18vyq0005vzpwrcclc6zw	cmpg168h30003vzpwayaamy36	001-001-000000005	eastudillojimenez@gmail.com	Fiestas & Eventos Emily <saydilourdesjc@gmail.com>	Factura 001-001-000000005 - Fiestas & Eventos Emily	Hola Elias Astudillo,\nAdjuntamos la factura 001-001-000000005 correspondiente a tu pedido PED-0005.\nTotal: $10,00\nEstado: Pendiente\nGracias por tu compra.\nFiestas & Eventos Emily\nTelefono: 0990651735	ENVIADO	2026-05-21 21:58:41.567	2026-05-21 21:58:41.57
cmpg1yuaj000bvzpwkylxz5dz	cmpg1w5gd0009vzpwk27oq1au	001-001-000000006	eastudillojimenez@gmail.com	Fiestas & Eventos Emily <saydilourdesjc@gmail.com>	Factura 001-001-000000006 - Fiestas & Eventos Emily	Hola Elias Astudillo,\nAdjuntamos la factura 001-001-000000006 correspondiente a tu pedido PED-0006.\nTotal: $10,00\nEstado: Pendiente\nGracias por tu compra.\nFiestas & Eventos Emily\nTelefono: 0990651735	ENVIADO	2026-05-21 22:18:52.504	2026-05-21 22:18:52.506
cmpg2abrl0003vzaoybyzvkfz	cmpg1w5gd0009vzpwk27oq1au	001-001-000000006	eastudillojimenez@gmail.com	Fiestas & Eventos Emily <saydilourdesjc@gmail.com>	Factura 001-001-000000006 - Fiestas & Eventos Emily	Hola Elias Astudillo,\nAdjuntamos la factura 001-001-000000006 correspondiente a tu pedido PED-0006.\nTotal: $10,00\nEstado: Firmada\nGracias por tu compra.\nFiestas & Eventos Emily\nTelefono: 0990651735	ENVIADO	2026-05-21 22:27:48.368	2026-05-21 22:27:48.37
cmpg2t797000fvzaoztq6maon	cmpg2slkx0009vzaoj98lxcgn	001-001-000000007	mleon542414@gmail.com	Fiestas & Eventos Emily <saydilourdesjc@gmail.com>	Factura 001-001-000000007 - Fiestas & Eventos Emily	Hola Merle Azucena León Borja,\nAdjuntamos la factura 001-001-000000007 correspondiente a tu pedido PED-0007.\nTotal: $58,00\nEstado: Firmada\nGracias por tu compra.\nFiestas & Eventos Emily\nTelefono: 0990651735	ENVIADO	2026-05-21 22:42:28.985	2026-05-21 22:42:28.987
cmpg2z2q4000pvzaoefx51h7g	cmpg2yjdx000jvzaozr4sxglp	001-001-000000008	joofrehonores@gmail.com	Fiestas & Eventos Emily <saydilourdesjc@gmail.com>	Factura 001-001-000000008 - Fiestas & Eventos Emily	Hola Joofre Honores Tapia,\nAdjuntamos la factura 001-001-000000008 correspondiente a tu pedido PED-0008.\nTotal: $20,00\nEstado: Firmada\nGracias por tu compra.\nFiestas & Eventos Emily\nTelefono: 0990651735	ENVIADO	2026-05-21 22:47:03.051	2026-05-21 22:47:03.053
\.


--
-- TOC entry 5248 (class 0 OID 16725)
-- Dependencies: 234
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Order" (id, code, "customerId", status, "deliveryDate", "deliveryTime", "deliveryAddress", dedication, "referenceImageNote", notes, subtotal, tax, discount, total, "createdAt", "updatedAt") FROM stdin;
order-1779385174276-m3hmr	PED-0001	customer-1779385145229-bxliv	LISTO	2026-05-21 05:00:00	13:39	Buenavista 500	\N	\N	\N	11.50	1.73	0.00	13.23	2026-05-21 17:39:34.391	2026-05-21 17:39:55.959
order-1779386876293-bjx5b	PED-0002	customer-1779385145229-bxliv	ENTREGADO	2026-05-21 05:00:00	13:09	Buenavista 500	\N	\N	\N	20.00	3.00	0.00	23.00	2026-05-21 18:07:56.413	2026-05-21 18:08:06.174
order-1779391351280-suqqz	PED-0003	customer-1779391261694-iscy0	CONFIRMADO	2026-05-21 05:00:00	14:21	Urb. Ciudad del Sol	\N	\N	\N	17.00	2.55	0.00	19.55	2026-05-21 19:22:31.377	2026-05-21 19:22:57.839
order-1779398857925-ehi6h	PED-0004	customer-1779391261694-iscy0	LISTO	2026-05-21 05:00:00	16:27	Urb. Ciudad del Sol	\N	\N	\N	17.00	0.00	0.00	17.00	2026-05-21 21:27:38.154	2026-05-21 21:29:36.696
order-1779400578411-pzl8e	PED-0005	customer-1779385145229-bxliv	LISTO	2026-05-21 05:00:00	16:55	Buenavista 500	\N	\N	\N	10.00	0.00	0.00	10.00	2026-05-21 21:56:18.506	2026-05-21 21:56:18.506
order-1779401785213-wyn1a	PED-0006	customer-1779385145229-bxliv	ENTREGADO	2026-05-21 05:00:00	17:16	Buenavista 500	\N	\N	\N	10.00	0.00	0.00	10.00	2026-05-21 22:16:25.294	2026-05-21 22:16:30.746
order-1779403304813-8bk9v	PED-0007	customer-1779402905683-iq2jq	ENTREGADO	2026-05-21 05:00:00	17:40	Machala, Ciudadela Las Brisas	\N	\N	\N	58.00	0.00	0.00	58.00	2026-05-21 22:41:44.909	2026-05-21 22:41:50.709
order-1779403557720-vn8zo	PED-0008	customer-1779403459920-jqqze	LISTO	2026-05-21 05:00:00	17:45	Machala	\N	\N	\N	20.00	0.00	0.00	20.00	2026-05-21 22:45:57.8	2026-05-21 22:46:19.845
\.


--
-- TOC entry 5249 (class 0 OID 16745)
-- Dependencies: 235
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrderItem" (id, "orderId", "productId", name, quantity, "unitPrice", total, customization) FROM stdin;
cmpfrznnn0001vzf8rc19uod8	order-1779385174276-m3hmr	\N	Torta personalizada	1	11.50	11.50	{"extras": [], "coverId": "cmpbhn33k000fvzo4dy8ji2zs", "modelId": "cmpbhn33p000hvzo42polck7r", "flavorId": "cmpbhn3310006vzo4r7co3f2i", "basePrice": 10, "coverName": "Chantilly", "fillingId": "cmpbhn33h000dvzo4c7grxa8k", "modelName": "Modelo personalizado", "flavorName": "Chocolate", "portionsId": "cmpbhn32o0000vzo49wv5fs1e", "fillingName": "Crema pastelera", "portionsLabel": "5 porciones", "coverExtraPrice": 0, "modelExtraPrice": 0, "fillingExtraPrice": 1.5}
cmpft04yl0001vzuw2f68s6ug	order-1779386876293-bjx5b	\N	Torta personalizada	1	20.00	20.00	{"extras": [], "coverId": "cmpbhn33k000fvzo4dy8ji2zs", "modelId": "cmpbhn33u000jvzo4fhh1cde5", "flavorId": "cmpbhn338000avzo4go002emj", "basePrice": 10, "coverName": "Chantilly", "fillingId": "cmpbhn33f000cvzo4oe3im96a", "modelName": "Modelo para eventos", "flavorName": "Frutos secos", "portionsId": "cmpbhn32o0000vzo49wv5fs1e", "fillingName": "Crema de avellana", "portionsLabel": "5 porciones", "coverExtraPrice": 0, "modelExtraPrice": 8, "fillingExtraPrice": 2}
cmpfvo1vc0007vzuwzt7jv0eq	order-1779391351280-suqqz	\N	Torta personalizada	1	17.00	17.00	{"extras": [], "coverId": "cmpbhn33k000fvzo4dy8ji2zs", "modelId": "cmpbhn33p000hvzo42polck7r", "flavorId": "cmpbhn338000avzo4go002emj", "basePrice": 15, "coverName": "Chantilly", "fillingId": "cmpbhn33f000cvzo4oe3im96a", "modelName": "Modelo personalizado", "flavorName": "Frutos secos", "portionsId": "cmpbhn32r0001vzo4gjkxs3cr", "fillingName": "Crema de avellana", "portionsLabel": "10 porciones", "coverExtraPrice": 0, "modelExtraPrice": 0, "fillingExtraPrice": 2}
cmpg07fbj0003vzf8npazf1q6	order-1779398857925-ehi6h	\N	Torta personalizada	1	17.00	17.00	{"extras": [], "coverId": "cmpbhn33o000gvzo4vd0xu5mh", "modelId": "cmpbhn33p000hvzo42polck7r", "flavorId": "cmpbhn3310006vzo4r7co3f2i", "basePrice": 15, "coverName": "Mantequilla", "fillingId": "cmpbhn33a000bvzo4w391suvg", "modelName": "Modelo personalizado", "flavorName": "Chocolate", "portionsId": "cmpbhn32r0001vzo4gjkxs3cr", "fillingName": "Manjar", "portionsLabel": "10 porciones", "coverExtraPrice": 2, "modelExtraPrice": 0, "fillingExtraPrice": 0}
cmpg15tke0001vzpw07ufilx2	order-1779400578411-pzl8e	\N	Torta personalizada	1	10.00	10.00	{"extras": [], "coverId": "cmpbhn33k000fvzo4dy8ji2zs", "modelId": "cmpbhn33p000hvzo42polck7r", "flavorId": "cmpbhn3310006vzo4r7co3f2i", "basePrice": 10, "coverName": "Chantilly", "fillingId": "cmpbhn33a000bvzo4w391suvg", "modelName": "Modelo personalizado", "flavorName": "Chocolate", "portionsId": "cmpbhn32o0000vzo49wv5fs1e", "fillingName": "Manjar", "portionsLabel": "8 porciones", "coverExtraPrice": 0, "modelExtraPrice": 0, "fillingExtraPrice": 0}
cmpg1vopn0007vzpwyfx4h2js	order-1779401785213-wyn1a	\N	Torta personalizada	1	10.00	10.00	{"extras": [], "coverId": "cmpbhn33k000fvzo4dy8ji2zs", "modelId": "cmpbhn33p000hvzo42polck7r", "flavorId": "cmpbhn3310006vzo4r7co3f2i", "basePrice": 10, "coverName": "Chantilly", "fillingId": "cmpbhn33a000bvzo4w391suvg", "modelName": "Modelo personalizado", "flavorName": "Chocolate", "portionsId": "cmpbhn32o0000vzo49wv5fs1e", "fillingName": "Manjar", "portionsLabel": "8 porciones", "coverExtraPrice": 0, "modelExtraPrice": 0, "fillingExtraPrice": 0}
cmpg2s9900005vzaomkdr2e4p	order-1779403304813-8bk9v	\N	Torta personalizada	1	58.00	58.00	{"extras": [], "coverId": "cmpbhn33k000fvzo4dy8ji2zs", "modelId": "cmpbhn33p000hvzo42polck7r", "flavorId": "flavor-1779402988132-y74z4", "basePrice": 25, "coverName": "Chantilly", "fillingId": "cmpbhn33f000cvzo4oe3im96a", "modelName": "Modelo personalizado", "flavorName": "Marmoleado", "portionsId": "cmpbhn32u0003vzo4x0o8nz28", "fillingName": "Crema de avellana", "portionsLabel": "20 porciones", "coverExtraPrice": 0, "modelExtraPrice": 0, "fillingExtraPrice": 3}
cmpg2s9940006vzaoramz35yd	order-1779403304813-8bk9v	cmpg0wcwk0001vzd0amu4fwnn	Bocaditos de Dulce	100	0.18	18.00	\N
cmpg2s9940007vzaoiq8t0bq4	order-1779403304813-8bk9v	product-1779402799905-pz9k0	Shots de Frutilla	12	1.00	12.00	\N
cmpg2xodr000hvzaozcnji03q	order-1779403557720-vn8zo	\N	Torta personalizada	1	20.00	20.00	{"extras": [], "coverId": "cmpbhn33k000fvzo4dy8ji2zs", "modelId": "cmpbhn33p000hvzo42polck7r", "flavorId": "flavor-1779402988132-y74z4", "basePrice": 20, "coverName": "Chantilly", "fillingId": "cmpbhn33a000bvzo4w391suvg", "modelName": "Modelo personalizado", "flavorName": "Marmoleado", "portionsId": "cmpbhn32t0002vzo445u32xlg", "fillingName": "Manjar", "portionsLabel": "15 porciones", "coverExtraPrice": 0, "modelExtraPrice": 0, "fillingExtraPrice": 0}
\.


--
-- TOC entry 5251 (class 0 OID 16777)
-- Dependencies: 237
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "orderId", "invoiceId", method, status, amount, reference, notes, "paidAt", "createdAt", "updatedAt") FROM stdin;
payment-1779419487914-pfu4v	order-1779403557720-vn8zo	cmpg2yjdx000jvzaozr4sxglp	TRANSFERENCIA	CONFIRMADO	20.00	33572620	\N	2026-05-21 05:00:00	2026-05-22 03:11:28.036	2026-05-22 03:11:28.036
payment-1779419512129-2ya3t	order-1779403304813-8bk9v	cmpg2slkx0009vzaoj98lxcgn	TRANSFERENCIA	CONFIRMADO	58.00	66521532	\N	2026-05-22 03:11:52.129	2026-05-22 03:11:52.189	2026-05-22 03:11:52.189
\.


--
-- TOC entry 5247 (class 0 OID 16708)
-- Dependencies: 233
-- Data for Name: PricingRule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PricingRule" (id, name, description, active, "appliesTo", conditions, calculation, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5239 (class 0 OID 16585)
-- Dependencies: 225
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Product" (id, name, description, category, "basePrice", "pricingMode", active, "createdAt", "updatedAt") FROM stdin;
cmpg0wcwh0000vzd0i0y0000i	Bocaditos de Sal	Bocaditos de sal genéricos. Precio de $20.00 por 100 unidades (o $10.00 por 50 unidades).	BOCADITOS_SAL	0.20	FIJO	t	2026-05-21 21:48:57.041	2026-05-21 21:48:57.041
cmpg0wcwk0001vzd0amu4fwnn	Bocaditos de Dulce	Bocaditos de dulce genéricos. Precio de $18.00 por 100 unidades (o $9.00 por 50 unidades).	BOCADITOS_DULCE	0.18	FIJO	t	2026-05-21 21:48:57.044	2026-05-21 21:48:57.044
product-1779402799905-pz9k0	Shots de Frutilla	\N	POSTRES	1.00	FIJO	t	2026-05-21 22:33:20.017	2026-05-21 22:39:21.09
\.


--
-- TOC entry 5241 (class 0 OID 16614)
-- Dependencies: 227
-- Data for Name: ProductOption; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProductOption" (id, "productId", name, type, required, "values") FROM stdin;
\.


--
-- TOC entry 5240 (class 0 OID 16603)
-- Dependencies: 226
-- Data for Name: ProductVariant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProductVariant" (id, "productId", name, price, metadata) FROM stdin;
\.


--
-- TOC entry 5236 (class 0 OID 16549)
-- Dependencies: 222
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Session" (id, "sessionToken", "userId", expires) FROM stdin;
cmpgyis790003vzgsq9073x7v	7e70974fd7e0c2a6099ec969ff501336bc478b9ee0b156149fe8b5a9014bae55	cmpcvpzc40000vzfkttkr43rn	2026-05-29 13:30:10.623
\.


--
-- TOC entry 5254 (class 0 OID 25587)
-- Dependencies: 240
-- Data for Name: SriJob; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SriJob" (id, "invoiceId", status, attempts, "lastError", "nextRunAt", "lockedAt", "completedAt", "createdAt", "updatedAt") FROM stdin;
cmpg25x720001vzaohmwtuw2y	cmpg1w5gd0009vzpwk27oq1au	COMPLETADO	2	\N	2026-05-21 22:25:24.35	\N	2026-05-21 22:27:16.961	2026-05-21 22:24:22.862	2026-05-21 22:27:16.963
cmpg2slly000bvzaoyi5unk3b	cmpg2slkx0009vzaoj98lxcgn	COMPLETADO	1	\N	2026-05-21 22:42:00.933	\N	2026-05-21 22:42:05.924	2026-05-21 22:42:00.934	2026-05-21 22:42:05.927
cmpg2st22000dvzaoiaol757g	cmpg2slkx0009vzaoj98lxcgn	COMPLETADO	1	\N	2026-05-21 22:42:10.584	\N	2026-05-21 22:42:15.617	2026-05-21 22:42:10.586	2026-05-21 22:42:15.619
cmpg2yjf7000lvzao5ktjj5jc	cmpg2yjdx000jvzaozr4sxglp	COMPLETADO	1	\N	2026-05-21 22:46:38.034	\N	2026-05-21 22:46:43.578	2026-05-21 22:46:38.035	2026-05-21 22:46:43.58
cmpg2yr8d000nvzaoit9ukesh	cmpg2yjdx000jvzaozr4sxglp	COMPLETADO	1	\N	2026-05-21 22:46:48.156	\N	2026-05-21 22:46:53.297	2026-05-21 22:46:48.157	2026-05-21 22:46:53.298
\.


--
-- TOC entry 5234 (class 0 OID 16523)
-- Dependencies: 220
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, name, email, "emailVerified", image, role, "createdAt", "updatedAt", "passwordHash") FROM stdin;
cmpcvpzc40000vzfkttkr43rn	Admin	admin@emily.local	\N	\N	ADMIN	2026-05-19 17:00:42.916	2026-05-19 17:00:42.916	scrypt:09ea98296f4717ecc723f70550ea5509:f13ce956c987ce0d684e88d94dc0dcfb8e68f3ed84a1cea126393aea6fae3573100f34e4e3b88ceac87c8d6693a9fed9fd69895be55cf83fd066fa5b7ee47a7f
\.


--
-- TOC entry 5237 (class 0 OID 16560)
-- Dependencies: 223
-- Data for Name: VerificationToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VerificationToken" (identifier, token, expires) FROM stdin;
\.


--
-- TOC entry 5233 (class 0 OID 16423)
-- Dependencies: 219
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
1af14c0b-8fec-4250-895c-8fad66047b7d	abe4458e624fe141ff82f02e01cf9471ef91ee2754d91aea117f4f367915bfc5	2026-05-18 12:37:56.940075-05	20260518173756_init_local	\N	\N	2026-05-18 12:37:56.838363-05	1
a26be317-d212-43ca-a244-3a6a5cf7904d	6d02d276c4ff326d4c5b3d0f138f5903d2f958c3ad0da904d3544b5db9ca2148	2026-05-19 12:00:13.771335-05	20260519170013_add_admin_password	\N	\N	2026-05-19 12:00:13.764284-05	1
70bd5773-072f-450d-8d3d-cc90cbcb589b	df82cf2012c1ecf9cff517efd41f50262b6b87453bab8a9169b5bf93b2807277	2026-05-19 12:31:26.861979-05	20260519173126_add_invoice_email_logs	\N	\N	2026-05-19 12:31:26.822011-05	1
d5031ad2-de43-413f-af0f-b208acb44a61	b27658405143627c98cd2f4cdec6c832c743113329baa704c41ad4d0ca3889e4	2026-05-20 13:01:14.584406-05	20260520180114_add_sri_jobs_and_invoice_states	\N	\N	2026-05-20 13:01:14.493936-05	1
4b1ab65d-45b5-4d0d-847e-9c05bfa23bc6	b6e21ba0eef21ea4061a1da42ed352c8810716f74b90cf72e5a0cb2f79cab1e9	2026-05-20 13:24:46.998894-05	20260520193000_add_sri_signature_config	\N	\N	2026-05-20 13:24:46.971843-05	1
\.


--
-- TOC entry 5019 (class 2606 OID 16548)
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- TOC entry 5065 (class 2606 OID 16820)
-- Name: BusinessSettings BusinessSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BusinessSettings"
    ADD CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY (id);


--
-- TOC entry 5047 (class 2606 OID 16689)
-- Name: CakeCover CakeCover_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CakeCover"
    ADD CONSTRAINT "CakeCover_pkey" PRIMARY KEY (id);


--
-- TOC entry 5044 (class 2606 OID 16673)
-- Name: CakeFilling CakeFilling_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CakeFilling"
    ADD CONSTRAINT "CakeFilling_pkey" PRIMARY KEY (id);


--
-- TOC entry 5041 (class 2606 OID 16657)
-- Name: CakeFlavor CakeFlavor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CakeFlavor"
    ADD CONSTRAINT "CakeFlavor_pkey" PRIMARY KEY (id);


--
-- TOC entry 5050 (class 2606 OID 16707)
-- Name: CakeModel CakeModel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CakeModel"
    ADD CONSTRAINT "CakeModel_pkey" PRIMARY KEY (id);


--
-- TOC entry 5037 (class 2606 OID 16641)
-- Name: CakePortion CakePortion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CakePortion"
    ADD CONSTRAINT "CakePortion_pkey" PRIMARY KEY (id);


--
-- TOC entry 5029 (class 2606 OID 16584)
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- TOC entry 5068 (class 2606 OID 18728)
-- Name: InvoiceEmailLog InvoiceEmailLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvoiceEmailLog"
    ADD CONSTRAINT "InvoiceEmailLog_pkey" PRIMARY KEY (id);


--
-- TOC entry 5061 (class 2606 OID 16776)
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- TOC entry 5057 (class 2606 OID 16757)
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- TOC entry 5055 (class 2606 OID 16744)
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- TOC entry 5063 (class 2606 OID 16792)
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- TOC entry 5052 (class 2606 OID 16724)
-- Name: PricingRule PricingRule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PricingRule"
    ADD CONSTRAINT "PricingRule_pkey" PRIMARY KEY (id);


--
-- TOC entry 5035 (class 2606 OID 16626)
-- Name: ProductOption ProductOption_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductOption"
    ADD CONSTRAINT "ProductOption_pkey" PRIMARY KEY (id);


--
-- TOC entry 5033 (class 2606 OID 16613)
-- Name: ProductVariant ProductVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_pkey" PRIMARY KEY (id);


--
-- TOC entry 5031 (class 2606 OID 16602)
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- TOC entry 5022 (class 2606 OID 16559)
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- TOC entry 5071 (class 2606 OID 25604)
-- Name: SriJob SriJob_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SriJob"
    ADD CONSTRAINT "SriJob_pkey" PRIMARY KEY (id);


--
-- TOC entry 5017 (class 2606 OID 16536)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 5014 (class 2606 OID 16436)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5020 (class 1259 OID 16822)
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- TOC entry 5045 (class 1259 OID 16831)
-- Name: CakeCover_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CakeCover_name_key" ON public."CakeCover" USING btree (name);


--
-- TOC entry 5042 (class 1259 OID 16830)
-- Name: CakeFilling_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CakeFilling_name_key" ON public."CakeFilling" USING btree (name);


--
-- TOC entry 5039 (class 1259 OID 16829)
-- Name: CakeFlavor_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CakeFlavor_name_key" ON public."CakeFlavor" USING btree (name);


--
-- TOC entry 5048 (class 1259 OID 16832)
-- Name: CakeModel_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CakeModel_name_key" ON public."CakeModel" USING btree (name);


--
-- TOC entry 5038 (class 1259 OID 16828)
-- Name: CakePortion_portions_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CakePortion_portions_key" ON public."CakePortion" USING btree (portions);


--
-- TOC entry 5026 (class 1259 OID 16826)
-- Name: Customer_document_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Customer_document_idx" ON public."Customer" USING btree (document);


--
-- TOC entry 5027 (class 1259 OID 16827)
-- Name: Customer_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Customer_name_idx" ON public."Customer" USING btree (name);


--
-- TOC entry 5066 (class 1259 OID 18729)
-- Name: InvoiceEmailLog_invoiceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvoiceEmailLog_invoiceId_idx" ON public."InvoiceEmailLog" USING btree ("invoiceId");


--
-- TOC entry 5058 (class 1259 OID 16834)
-- Name: Invoice_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Invoice_number_key" ON public."Invoice" USING btree (number);


--
-- TOC entry 5059 (class 1259 OID 16835)
-- Name: Invoice_orderId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Invoice_orderId_key" ON public."Invoice" USING btree ("orderId");


--
-- TOC entry 5053 (class 1259 OID 16833)
-- Name: Order_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Order_code_key" ON public."Order" USING btree (code);


--
-- TOC entry 5023 (class 1259 OID 16823)
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- TOC entry 5069 (class 1259 OID 25606)
-- Name: SriJob_invoiceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SriJob_invoiceId_idx" ON public."SriJob" USING btree ("invoiceId");


--
-- TOC entry 5072 (class 1259 OID 25605)
-- Name: SriJob_status_nextRunAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SriJob_status_nextRunAt_idx" ON public."SriJob" USING btree (status, "nextRunAt");


--
-- TOC entry 5015 (class 1259 OID 16821)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 5024 (class 1259 OID 16825)
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- TOC entry 5025 (class 1259 OID 16824)
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- TOC entry 5073 (class 2606 OID 16836)
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5084 (class 2606 OID 18730)
-- Name: InvoiceEmailLog InvoiceEmailLog_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvoiceEmailLog"
    ADD CONSTRAINT "InvoiceEmailLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5080 (class 2606 OID 16876)
-- Name: Invoice Invoice_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5081 (class 2606 OID 16871)
-- Name: Invoice Invoice_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5078 (class 2606 OID 16861)
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5079 (class 2606 OID 16866)
-- Name: OrderItem OrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5077 (class 2606 OID 16856)
-- Name: Order Order_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5082 (class 2606 OID 16886)
-- Name: Payment Payment_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5083 (class 2606 OID 16881)
-- Name: Payment Payment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5076 (class 2606 OID 16851)
-- Name: ProductOption ProductOption_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductOption"
    ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5075 (class 2606 OID 16846)
-- Name: ProductVariant ProductVariant_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5074 (class 2606 OID 16841)
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5085 (class 2606 OID 25607)
-- Name: SriJob SriJob_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SriJob"
    ADD CONSTRAINT "SriJob_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2026-05-22 08:42:51

--
-- PostgreSQL database dump complete
--

\unrestrict qzXmcjyJCQbOzXvu2gebgzRbyaV3hvZm0Mos8613qA61cNjmE10RKslmag4SLPk

