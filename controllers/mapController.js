// map configuration
export const getMapConfig=(req,res)=>{
    const apiKey=process.env.GOOGLE_MAPS_API_KEY||'';
    if(!apiKey)return res.status(503).json({success:false,error:'Google Maps API key is not configured'});
    res.json({success:true,apiKey});
};
